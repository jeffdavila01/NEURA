"use strict";

const $ = id => document.getElementById(id);
let findings = [];
let summaries = [];
let grouped = [];

const errorTokens =
  /#REF!|#DIV\/0!|#VALUE!|#NAME\?|#N\/A|#NUM!|#NULL!/i;

const tradingWords =
  /trade|trading|position|portfolio|ticker|stock|exposure|shares|profit|loss|risk|performance|holdings|dividend/i;

function addIssue(sheet, cell, severity, issue, action, formula = "") {
  findings.push({ sheet, cell, severity, issue, action, formula });
}

function addRow(id, values) {
  const tr = document.createElement("tr");
  for (const value of values) {
    const td = document.createElement("td");
    td.textContent = String(value ?? "");
    tr.appendChild(td);
  }
  $(id).appendChild(tr);
}

function normalizeFormula(formula, address) {
  const origin = XLSX.utils.decode_cell(address);

  // Basic relative-reference pattern recognition.
  // Absolute references retain their original identity.
  return formula.toUpperCase().replace(
    /(\$?)([A-Z]{1,3})(\$?)(\d+)/g,
    (match, absCol, letters, absRow, rowText) => {
      try {
        const ref = XLSX.utils.decode_cell(
          absCol + letters + absRow + rowText
        );
        const col = absCol ? "C" + ref.c : "C~" + (ref.c - origin.c);
        const row = absRow ? "R" + ref.r : "R~" + (ref.r - origin.r);
        return col + row;
      } catch {
        return match;
      }
    }
  );
}

function inspectFormulas(ws, sheetName) {
  let total = 0;
  const formulasByColumn = new Map();

  for (const [address, cell] of Object.entries(ws)) {
    if (address.startsWith("!")) continue;

    if (cell.t === "e") {
      addIssue(
        sheetName, address, "High",
        "Cached Excel error",
        "Review formula inputs and referenced values.",
        cell.f || ""
      );
    }

    if (typeof cell.f !== "string") continue;
    total++;

    const formula = cell.f;
    const loc = XLSX.utils.decode_cell(address);

    if (errorTokens.test(formula)) {
      addIssue(
        sheetName, address, "High",
        "Error token in formula",
        "Investigate broken references or invalid arguments.",
        formula
      );
    }

    if (/GOOGLEFINANCE|__xludf\.DUMMYFUNCTION/i.test(formula)) {
      addIssue(
        sheetName, address, "Warning",
        "Google Sheets compatibility",
        "Formula may require Google Sheets. Check its data source.",
        formula
      );
    }

    const dateMatch = formula.match(
      /NETWORKDAYS\s*\(\s*(\$?[A-Z]+\$?\d+)\s*,\s*(\$?[A-Z]+\$?\d+)/i
    );

    if (dateMatch) {
      const suspicious = [dateMatch[1], dateMatch[2]].some(ref => {
        const input = ws[ref.replace(/\$/g, "")];
        return input && /[%$£€₱]/.test(String(input.z || ""));
      });

      if (suspicious) {
        addIssue(
          sheetName, address, "Warning",
          "Suspicious date inputs",
          "NETWORKDAYS references a currency or percentage-formatted cell.",
          formula
        );
      }
    }

    if (!formulasByColumn.has(loc.c)) {
      formulasByColumn.set(loc.c, []);
    }

    formulasByColumn.get(loc.c).push({
      row: loc.r,
      address,
      formula,
      pattern: normalizeFormula(formula, address)
    });
  }

  // Compare only consecutive formula rows.
  for (const entries of formulasByColumn.values()) {
    entries.sort((a, b) => a.row - b.row);

    for (let i = 1; i < entries.length - 1; i++) {
      const prev = entries[i - 1];
      const curr = entries[i];
      const next = entries[i + 1];

      if (curr.row !== prev.row + 1 ||
          next.row !== curr.row + 1) continue;

      if (prev.pattern === next.pattern &&
          curr.pattern !== prev.pattern) {
        addIssue(
          sheetName, curr.address, "Review",
          "Formula pattern differs",
          "Neighboring formulas follow another pattern. Check whether intentional.",
          curr.formula
        );
      }
    }
  }

  // Blank gaps between formula cells.
  for (const [col, entries] of formulasByColumn) {
    entries.sort((a, b) => a.row - b.row);

    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1];
      const next = entries[i];

      if (next.row !== prev.row + 2) continue;
      if (prev.pattern !== next.pattern) continue;

      const address = XLSX.utils.encode_cell({
        r: prev.row + 1, c: col
      });

      const middle = ws[address];

      if (!middle || (middle.v == null && !middle.f)) {
        addIssue(
          sheetName, address, "Review",
          "Possible missing formula",
          "Blank cell between matching formula patterns."
        );
      }
    }
  }

  return total;
}

function groupFindings() {
  const groups = new Map();

  for (const item of findings) {
    const key = JSON.stringify([
      item.sheet, item.severity, item.issue, item.action
    ]);

    if (!groups.has(key)) {
      groups.set(key, {
        sheet: item.sheet,
        severity: item.severity,
        issue: item.issue,
        action: item.action,
        count: 0,
        cells: [],
        allCells: []
      });
    }

    const group = groups.get(key);
    group.count++;
    group.allCells.push(item.cell);

    if (group.cells.length < 6) {
      group.cells.push(item.cell);
    }
  }

  const priority = { High: 0, Warning: 1, Review: 2 };

  return [...groups.values()].sort((a, b) =>
    priority[a.severity] - priority[b.severity] ||
    a.sheet.localeCompare(b.sheet) ||
    a.issue.localeCompare(b.issue)
  );
}

function setupFilters() {
  if ($("tradingFilters")) return;

  const container = document.createElement("div");
  container.id = "tradingFilters";
  container.style.cssText =
    "display:flex;gap:10px;flex-wrap:wrap;margin:15px 0;align-items:center";

  const search = document.createElement("input");
  search.id = "tradingSearch";
  search.placeholder = "Search sheet, cell or issue...";
  search.setAttribute("aria-label", "Search diagnostic findings");
  search.style.cssText =
    "padding:11px;min-width:230px;flex:1;border:1px solid #dce3eb;border-radius:8px";

  const severity = document.createElement("select");
  severity.id = "severityFilter";
  severity.setAttribute("aria-label", "Filter by severity");
  severity.style.cssText =
    "padding:11px;border:1px solid #dce3eb;border-radius:8px";

  for (const level of ["All", "High", "Warning", "Review"]) {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = level === "All" ? "All Severities" : level;
    severity.appendChild(option);
  }

  const counter = document.createElement("span");
  counter.id = "groupCounter";
  counter.style.cssText = "font-size:13px;color:#64748b";

  container.append(search, severity, counter);

  const table = $("diagnostics").closest("table");
  table.parentElement.before(container);

  // Add grouped-results headers.
  const headings = table.querySelectorAll("thead th");
  const labels = [
    "Worksheet", "Sample Cells", "Severity",
    "Issue / Count", "Recommended Action"
  ];

  headings.forEach((heading, i) => {
    if (labels[i]) heading.textContent = labels[i];
  });

  search.addEventListener("input", renderGroups);
  severity.addEventListener("change", renderGroups);
}

function renderGroups() {
  const query = $("tradingSearch").value.toLowerCase().trim();
  const severity = $("severityFilter").value;
  const tbody = $("diagnostics");

  const filtered = grouped.filter(group => {
    if (severity !== "All" && group.severity !== severity) return false;

    const searchable = [
      group.sheet, group.issue, group.action,
      ...group.allCells
    ].join(" ").toLowerCase();

    return searchable.includes(query);
  });

  tbody.replaceChildren();

  // Keep large reports responsive.
  const page = filtered.slice(0, 500);

  for (const group of page) {
    addRow("diagnostics", [
      group.sheet,
      group.cells.join(", ") + (group.count > 6 ? " ..." : ""),
      group.severity,
      group.issue + " (" + group.count + " cell" +
        (group.count === 1 ? "" : "s") + ")",
      group.action
    ]);
  }

  if (!filtered.length) {
    addRow("diagnostics", [
      "—", "—", "—", "No matching findings", "Try another filter."
    ]);
  }

  $("groupCounter").textContent =
    filtered.length + " groups / " +
    filtered.reduce((sum, group) => sum + group.count, 0) +
    " findings" +
    (filtered.length > 500 ? " (first 500 groups shown)" : "");
}

async function analyze() {
  const file = $("fileInput").files[0];

  if (!file) {
    $("status").textContent = "Select an Excel workbook first.";
    return;
  }

  if (typeof XLSX === "undefined") {
    $("status").textContent =
      "SheetJS unavailable. Check the internet connection.";
    return;
  }

  $("analyzeBtn").disabled = true;
  $("exportBtn").disabled = true;
  $("status").textContent = "Scanning formulas and grouping findings...";

  findings = [];
  summaries = [];
  grouped = [];

  try {
    const bytes = await file.arrayBuffer();

    const workbook = XLSX.read(bytes, {
      type: "array",
      cellFormula: true,
      cellNF: true,
      cellDates: false
    });

    for (const name of workbook.SheetNames) {
      const ws = workbook.Sheets[name];
      const before = findings.length;
      const formulas = ws ? inspectFormulas(ws, name) : 0;

      summaries.push({
        name,
        formulas,
        issues: findings.length - before
      });
    }

    grouped = groupFindings();

    $("sheetsCount").textContent = workbook.SheetNames.length;
    $("formulaCount").textContent = summaries.reduce(
      (sum, item) => sum + item.formulas, 0
    );
    $("issueCount").textContent = findings.length;

    const isTrading = workbook.SheetNames.some(name =>
      tradingWords.test(name)
    );

    $("workbookType").textContent = isTrading
      ? "Detected trading-related workbook."
      : "Trading type not confirmed. Generic formula checks applied.";

    $("scanSummary").textContent =
      findings.length + " individual findings organized into " +
      grouped.length + " issue groups. " +
      "Findings are diagnostic flags, not confirmed calculation errors. " +
      "P&L and portfolio balances have not been recalculated.";

    $("sheetResults").replaceChildren();

    for (const item of summaries) {
      addRow("sheetResults", [
        item.name, item.formulas, item.issues
      ]);
    }

    renderGroups();
    $("exportBtn").disabled = false;
    $("status").textContent =
      "Analysis complete. Original Excel file unchanged.";

  } catch (error) {
    $("status").textContent = "Analysis failed: " + error.message;
  } finally {
    $("analyzeBtn").disabled = false;
  }
}

function exportReport() {
  const rows = [
    ["Worksheet", "Cell", "Severity", "Issue", "Action", "Formula"],
    ...findings.map(item => [
      item.sheet, item.cell, item.severity,
      item.issue, item.action, item.formula
    ])
  ];

  const csv = rows.map(row =>
    row.map(value => {
      let text = String(value ?? "");

      // Prevent CSV formula injection when opening reports in Excel.
      if (/^\s*[=+\-@\t\r\n]/.test(text)) {
        text = "'" + text;
      }

      return '"' + text.replace(/"/g, '""') + '"';
    }).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "sheetfix-trading-v14-report.csv";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

setupFilters();

$("analyzeBtn").addEventListener("click", analyze);
$("exportBtn").addEventListener("click", exportReport);
