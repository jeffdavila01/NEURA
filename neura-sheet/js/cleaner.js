"use strict";

const $ = id => document.getElementById(id);
const PREVIEW_LIMIT = 300;

let originalBytes = null;
let originalName = "";
let cleanedWorkbook = null;
let findings = [];
let verificationPassed = false;
let analysisOptions = null;
let analysisSheets = [];

const controlChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function getOptions() {
  return {
    trim: $("trimSpaces").checked,
    normalize: $("normalizeSpaces").checked,
    invisible: $("removeInvisible").checked,
    blankRows: $("detectBlankRows").checked
  };
}

function cleanText(value, options) {
  let result = value;

  if (options.invisible) {
    result = result.replace(controlChars, "");
  }

  if (options.normalize) {
    result = result.replace(/[\t \u00A0]{2,}/g, " ");
  }

  if (options.trim) {
    result = result.replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, "");
  }

  return result;
}

function classify(before, options) {
  const issues = [];

  if (options.trim && /^[\s\u00A0]|[\s\u00A0]$/.test(before)) {
    issues.push("Outer whitespace");
  }

  if (options.normalize && /[\t \u00A0]{2,}/.test(before)) {
    issues.push("Repeated spaces");
  }

  if (options.invisible && controlChars.test(before)) {
    issues.push("Invisible characters");
  }

  controlChars.lastIndex = 0;

  return issues.length ? issues.join("; ") : "Text normalization";
}

function visibleText(value) {
  return String(value)
    .replace(/ /g, "\u00B7")
    .replace(/\u00A0/g, "\u2423")
    .replace(/\t/g, "\u2192")
    .replace(/\r\n/g, "\u23CE")
    .replace(/\r/g, "\u23CE")
    .replace(/\n/g, "\u23CE")
    .replace(/[\u0000-\u001F\u007F]/g, "\uFFFD");
}

function addCell(row, text, kind = "") {
  const td = document.createElement("td");

  if (kind) {
    const span = document.createElement("span");
    span.className = "cleaner-value cleaner-" + kind;
    span.textContent = visibleText(text);
    td.appendChild(span);
  } else {
    td.textContent = String(text ?? "");
  }

  row.appendChild(td);
}

function showRow(item) {
  const tr = document.createElement("tr");

  addCell(tr, item.sheet);
  addCell(tr, item.address);
  addCell(tr, item.issue);
  addCell(tr, item.before, "before");
  addCell(tr, item.after, "after");

  $("results").appendChild(tr);
}

function setVerification(message, state = "") {
  const element = $("verificationStatus");
  element.textContent = message;
  element.className = "verification-status " + state;
}

function resetResults() {
  findings = [];
  cleanedWorkbook = null;
  verificationPassed = false;
  analysisOptions = null;
  analysisSheets = [];

  $("sheetCount").textContent = "0";
  $("changeCount").textContent = "0";
  $("blankCount").textContent = "0";
  $("previewCount").textContent = "No results";

  $("verifyBtn").disabled = true;
  $("downloadBtn").disabled = true;
  $("results").replaceChildren();

  setVerification("Not verified yet.");
}

function occupiedRows(ws) {
  const occupied = new Set();

  for (const [address, cell] of Object.entries(ws)) {
    if (address.startsWith("!")) continue;

    if (cell && (cell.f != null || cell.v != null)) {
      occupied.add(XLSX.utils.decode_cell(address).r);
    }
  }

  if (occupied.size < 2) return [];

  const sorted = [...occupied].sort((a, b) => a - b);
  const blanks = [];

  for (let row = sorted[0] + 1; row < sorted.at(-1); row++) {
    if (!occupied.has(row)) blanks.push(row + 1);
  }

  return blanks;
}

async function loadFile() {
  resetResults();
  originalBytes = null;

  const file = $("fileInput").files[0];
  $("sheetSelect").disabled = true;
  $("sheetSelect").replaceChildren();

  if (!file || !/\.(xlsx|xls)$/i.test(file.name)) {
    $("fileStatus").textContent = "Choose an .xlsx or .xls workbook.";
    return;
  }

  if (typeof XLSX === "undefined") {
    $("fileStatus").textContent = "Excel library unavailable.";
    return;
  }

  try {
    const bytes = await file.arrayBuffer();
    const book = XLSX.read(bytes, {
      type: "array",
      cellFormula: true
    });

    originalBytes = bytes;
    originalName = file.name;

    const select = $("sheetSelect");

    const all = new Option("All Worksheets", "__all__");
    select.appendChild(all);

    book.SheetNames.forEach((name, index) => {
      select.appendChild(new Option(name, String(index)));
    });

    select.disabled = false;

    $("fileStatus").textContent =
      file.name + " — " + book.SheetNames.length + " worksheets";

    $("status").textContent =
      "Ready. Click Analyze & Preview.";

  } catch (error) {
    $("fileStatus").textContent =
      "Cannot read workbook: " + error.message;
  }
}

async function analyze() {
  if (!originalBytes) {
    $("status").textContent = "Upload an Excel file first.";
    return;
  }

  resetResults();
  $("analyzeBtn").disabled = true;
  $("status").textContent = "Analyzing spreadsheet...";

  try {
    const book = XLSX.read(originalBytes.slice(0), {
      type: "array",
      cellFormula: true,
      cellNF: true,
      cellStyles: true
    });

    const opts = getOptions();
    const selection = $("sheetSelect").value;
    const indices = selection === "__all__"
      ? book.SheetNames.map((_, i) => i)
      : [Number(selection)];

    let textCount = 0;
    let blankCount = 0;

    analysisOptions = opts;
    analysisSheets = indices.map(i => book.SheetNames[i]);

    for (const index of indices) {
      const name = book.SheetNames[index];
      const ws = book.Sheets[name];

      for (const [address, cell] of Object.entries(ws)) {
        if (address.startsWith("!")) continue;

        // Protect formulas and non-text cells.
        if (!cell || cell.t !== "s" || cell.f != null) continue;
        if (typeof cell.v !== "string") continue;

        const before = cell.v;
        const after = cleanText(before, opts);

        if (before === after) continue;

        findings.push({
          sheet: name,
          address,
          issue: classify(before, opts),
          before,
          after,
          kind: "text"
        });

        cell.v = after;
        delete cell.w;
        textCount++;
      }

      if (opts.blankRows) {
        const rows = occupiedRows(ws);
        blankCount += rows.length;

        for (const row of rows) {
          findings.push({
            sheet: name,
            address: "Row " + row,
            issue: "Empty row — review only",
            before: "(blank)",
            after: "(unchanged)",
            kind: "warning"
          });
        }
      }
    }

    cleanedWorkbook = book;

    $("sheetCount").textContent = indices.length;
    $("changeCount").textContent = textCount;
    $("blankCount").textContent = blankCount;

    const tbody = $("results");
    tbody.replaceChildren();

    findings.slice(0, PREVIEW_LIMIT).forEach(showRow);

    if (!findings.length) {
      showRow({
        sheet: "—",
        address: "—",
        issue: "No issues detected",
        before: "",
        after: ""
      });
    }

    $("previewCount").textContent =
      findings.length + " findings" +
      (findings.length > PREVIEW_LIMIT
        ? " (first " + PREVIEW_LIMIT + " shown)"
        : "");

    $("verifyBtn").disabled = false;
    $("status").textContent = "Preview ready. Verify before export.";

  } catch (error) {
    $("status").textContent = "Analysis failed: " + error.message;
    cleanedWorkbook = null;
  } finally {
    $("analyzeBtn").disabled = false;
  }
}

function verifyCleaned() {
  if (!cleanedWorkbook || !analysisOptions) return;

  let remaining = 0;
  let checked = 0;

  // Re-apply the selected cleaning rules to the cleaned values.
  for (const name of analysisSheets) {
    const ws = cleanedWorkbook.Sheets[name];

    for (const [address, cell] of Object.entries(ws)) {
      if (address.startsWith("!")) continue;

      if (!cell || cell.t !== "s" ||
          cell.f != null || typeof cell.v !== "string") continue;

      checked++;

      if (cleanText(cell.v, analysisOptions) !== cell.v) {
        remaining++;
      }
    }
  }

  verificationPassed = remaining === 0;

  if (verificationPassed) {
    setVerification(
      "PASSED: " + checked +
      " text cells rechecked. No remaining changes under selected rules. " +
      "Blank rows and other data-quality problems are not included in this check.",
      "passed"
    );
  } else {
    setVerification(
      "REVIEW: " + remaining +
      " text cells still need cleaning.",
      "failed"
    );
  }

  const textChanges = findings.filter(f => f.kind === "text").length;
  $("downloadBtn").disabled = !verificationPassed || textChanges === 0;
}

function exportCleaned() {
  if (!verificationPassed || !cleanedWorkbook) return;

  const approved = confirm(
    "Export cleaned Excel copy?\n\n" +
    "Original workbook will not be modified.\n" +
    "Verify formulas and advanced formatting after export."
  );

  if (!approved) return;

  try {
    const filename = originalName.replace(/\.(xlsx|xls)$/i, "");

    XLSX.writeFile(
      cleanedWorkbook,
      filename + "_NeuraSheet_Cleaned.xlsx",
      {
        bookType: "xlsx",
        compression: true
      }
    );

    $("status").textContent =
      "Export complete. Review the Excel copy before using it.";

  } catch (error) {
    $("status").textContent = "Export failed: " + error.message;
  }
}

$("fileInput").addEventListener("change", loadFile);
$("analyzeBtn").addEventListener("click", analyze);
$("verifyBtn").addEventListener("click", verifyCleaned);
$("downloadBtn").addEventListener("click", exportCleaned);

$("sheetSelect").addEventListener("change", () => {
  resetResults();
  $("status").textContent = "Selection changed. Analyze again.";
});

[
  "trimSpaces",
  "normalizeSpaces",
  "removeInvisible",
  "detectBlankRows"
].forEach(id => {
  $(id).addEventListener("change", () => {
    resetResults();
    $("status").textContent = "Options changed. Analyze again.";
  });
});

