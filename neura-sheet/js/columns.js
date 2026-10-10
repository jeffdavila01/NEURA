"use strict";

const $ = id => document.getElementById(id);

let workbook = null;
let filename = "";
let context = null;
let mappings = [];

const presets = {
  customer: "Customer ID, Name, Last Name, Email, Phone, Amount, Signup Date",
  inventory: "Item ID, Item Name, Beginning Stock, Stock In, Stock Out, Ending Stock",
  sales: "Invoice, Date, Customer, Quantity, Unit Price, Total",
  custom: ""
};

const aliases = {
  "first name": ["first name", "firstname", "fname", "given name", "name"],
  "last name": ["last name", "lastname", "surname"],
  "email": ["email", "email address", "e mail"],
  "phone": ["phone", "mobile", "phone number", "contact number"],
  "customer id": ["customer id", "client id"],
  "name": ["name", "first name", "customer name"],
  "amount": ["amount", "total amount"],
  "signup date": ["signup date", "registration date"],
  "item id": ["item id", "sku", "product id"],
  "item name": ["item name", "product name", "product"],
  "beginning stock": ["beginning stock", "opening stock"],
  "stock in": ["stock in", "delivery", "received"],
  "stock out": ["stock out", "quantity sold", "issued"],
  "ending stock": ["ending stock", "closing stock"],
  "invoice": ["invoice", "invoice no", "invoice number"],
  "date": ["date", "transaction date"],
  "customer": ["customer", "client", "customer name"],
  "quantity": ["quantity", "qty"],
  "unit price": ["unit price", "price per unit"],
  "total": ["total", "total amount"]
};

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");
}

function cellAt(ws, r, c) {
  return ws[XLSX.utils.encode_cell({r, c})];
}

function makeNode(tag, text, className = "") {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function addTableRow(parent, values, header = false) {
  const tr = document.createElement("tr");

  values.forEach(value => {
    tr.appendChild(
      makeNode(header ? "th" : "td", String(value ?? ""))
    );
  });

  parent.appendChild(tr);
}

function ensureEditor() {
  if ($("mappingEditor")) return;

  const mappingTable = $("mappingResults").closest(".table-wrap");

  const toolbar = makeNode("div", "", "mapping-toolbar");

  const addButton = makeNode("button", "+ Add Column");
  addButton.type = "button";
  addButton.className = "secondary";

  const resetButton = makeNode("button", "Reset Mapping");
  resetButton.type = "button";
  resetButton.className = "secondary";

  const status = makeNode("p", "", "mapping-status");
  status.id = "mappingStatus";

  const editor = makeNode("div", "", "mapping-editor");
  editor.id = "mappingEditor";

  toolbar.append(addButton, resetButton);
  mappingTable.before(toolbar, status, editor);

  addButton.addEventListener("click", () => {
    if (!context) return;

    const used = new Set(mappings.map(m => m.col));
    const available = context.columns.find(c => !used.has(c.col));

    if (!available) {
      $("status").textContent = "All columns are already mapped.";
      return;
    }

    mappings.push({
      col: available.col,
      label: available.name
    });

    refresh();
  });

  resetButton.addEventListener("click", () => {
    if (!context) return;
    buildMappings();
    refresh();
  });
}

function reset(message = "Analyze your workbook to begin.") {
  context = null;
  mappings = [];

  $("exportBtn").disabled = true;
  $("detectedCount").textContent = "0";
  $("matchedCount").textContent = "0";
  $("missingCount").textContent = "0";
  $("mappingResults").replaceChildren();
  $("previewTable").replaceChildren();
  $("previewInfo").textContent = message;

  $("mappingEditor").replaceChildren();
  $("mappingStatus").textContent = "";
}

async function loadFile() {
  workbook = null;
  reset();

  $("sheetSelect").replaceChildren();
  $("sheetSelect").disabled = true;

  const file = $("fileInput").files[0];

  if (!file || !/\.(xlsx|xls)$/i.test(file.name)) {
    $("fileStatus").textContent = "Choose an Excel file.";
    return;
  }

  if (typeof XLSX === "undefined") {
    $("fileStatus").textContent = "SheetJS library unavailable.";
    return;
  }

  try {
    const bytes = await file.arrayBuffer();

    workbook = XLSX.read(bytes, {
      type: "array",
      cellFormula: true,
      cellNF: true
    });

    filename = file.name;

    workbook.SheetNames.forEach((name, index) => {
      $("sheetSelect").appendChild(
        new Option(name, String(index))
      );
    });

    $("sheetSelect").disabled = false;

    $("fileStatus").textContent =
      filename + " — " + workbook.SheetNames.length + " worksheets.";

    $("status").textContent = "Ready. Click Analyze Columns.";
  } catch (error) {
    workbook = null;
    $("fileStatus").textContent = "Read failed: " + error.message;
  }
}

function matchingSource(requested, columns, used) {
  const wanted = normalize(requested);
  const variants = aliases[wanted] || [wanted];

  const matches = columns.filter(column =>
    !used.has(column.col) &&
    variants.includes(normalize(column.name))
  );

  return matches.length === 1 ? matches[0] : null;
}

function sampleValues(column) {
  if (!context) return [];

  const values = [];

  for (
    let row = context.headerRow + 1;
    row <= context.range.e.r && values.length < 20;
    row++
  ) {
    const cell = cellAt(context.ws, row, column.col);

    if (!cell || cell.f || cell.v == null) continue;

    const text = String(cell.v).trim();

    if (text) values.push(text);
  }

  return values;
}

function patternScore(requested, column) {
  const type = normalize(requested);
  const values = sampleValues(column);

  if (values.length < 3) return 0;

  let hits = 0;

  for (const value of values) {
    if (type === "email" || type === "email address") {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) hits++;
    } else if (
      type === "phone" ||
      type === "mobile" ||
      type === "phone number"
    ) {
      const digits = value.replace(/\D/g, "");

      if (/^[+\d()\s.-]+$/.test(value) &&
          digits.length >= 7 &&
          digits.length <= 15) {
        hits++;
      }
    } else if (
      type === "customer id" ||
      type === "item id"
    ) {
      if (/^[A-Za-z]{1,6}[-_]?\d{2,12}$/.test(value)) {
        hits++;
      }
    }
  }

  const ratio = hits / values.length;

  return ratio >= 0.85 ? 80 : 0;
}

function scoreColumn(requested, column) {
  const wanted = normalize(requested);
  const actual = normalize(column.name);

  if (wanted === actual) {
    return { score: 100, reason: "Exact header match" };
  }

  const alternatives = aliases[wanted] || [];

  if (alternatives.some(name => normalize(name) === actual)) {
    return { score: 90, reason: "Recognized alternative header" };
  }

  const pattern = patternScore(requested, column);

  if (pattern) {
    return { score: pattern, reason: "Detected from sample values" };
  }

  return { score: 0, reason: "" };
}

function buildMappings() {
  if (!context) return;

  const desired = $("desiredOrder").value
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  const used = new Set();
  mappings = [];

  context.unmatchedRequested = [];
  context.suggestions = [];

  for (const requested of desired) {
    const ranked = context.columns
      .filter(column => !used.has(column.col))
      .map(column => ({
        column,
        ...scoreColumn(requested, column)
      }))
      .filter(item => item.score >= 80)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];

    // Never guess when multiple candidates tie.
    if (!best ||
        (ranked.length > 1 &&
         ranked[1].score === best.score)) {
      context.unmatchedRequested.push(requested);
      continue;
    }

    used.add(best.column.col);

    mappings.push({
      col: best.column.col,
      label: requested
    });

    context.suggestions.push({
      requested,
      source: best.column.name,
      score: best.score,
      reason: best.reason
    });
  }

  // Preserve all other source columns in their original order.
  for (const column of context.columns) {
    if (used.has(column.col)) continue;

    mappings.push({
      col: column.col,
      label: column.name
    });
  }
}
function analyze() {
  reset();

  if (!workbook) {
    $("status").textContent = "Upload a workbook first.";
    return;
  }

  const name = workbook.SheetNames[
    Number($("sheetSelect").value)
  ];

  const ws = workbook.Sheets[name];
  const headerNumber = Number($("headerRow").value);

  if (!Number.isSafeInteger(headerNumber) || headerNumber < 1) {
    $("status").textContent = "Invalid header row.";
    return;
  }

  if (!ws?.["!ref"]) {
    $("status").textContent = "Worksheet is empty.";
    return;
  }

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const headerRow = headerNumber - 1;

  if (headerRow < range.s.r || headerRow > range.e.r) {
    $("status").textContent = "Header row outside used range.";
    return;
  }

  const columns = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const header = cellAt(ws, headerRow, col);

    columns.push({
      col,
      name: String(header?.v ?? "").trim() ||
        "Column " + XLSX.utils.encode_col(col)
    });
  }

  let formulaCount = 0;

  for (const [address, cell] of Object.entries(ws)) {
    if (address.startsWith("!")) continue;

    if (
      XLSX.utils.decode_cell(address).r >= headerRow &&
      cell?.f != null
    ) {
      formulaCount++;
    }
  }

  context = {
    ws, name, range, headerRow, columns, formulaCount
  };

  buildMappings();
  refresh();
}

function moveMapping(index, direction) {
  const target = index + direction;

  if (target < 0 || target >= mappings.length) return;

  [mappings[index], mappings[target]] =
    [mappings[target], mappings[index]];

  refresh();
}

function makeButton(label, onClick, disabled = false) {
  const button = makeNode("button", label);
  button.type = "button";
  button.className = "secondary";
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function renderEditor() {
  const editor = $("mappingEditor");
  editor.replaceChildren();

  mappings.forEach((mapping, index) => {
    const item = makeNode("div", "", "mapping-item");

    const position = makeNode(
      "span", String(index + 1), "mapping-position"
    );

    const select = document.createElement("select");
    select.setAttribute(
      "aria-label", "Source column " + (index + 1)
    );

    context.columns.forEach(column => {
      select.appendChild(new Option(
        XLSX.utils.encode_col(column.col) + " — " + column.name,
        String(column.col)
      ));
    });

    select.value = String(mapping.col);

    select.addEventListener("change", () => {
      mapping.col = Number(select.value);
      refresh();
    });

    const labelInput = document.createElement("input");
    labelInput.value = mapping.label;
    labelInput.placeholder = "Output Header";
    labelInput.setAttribute(
      "aria-label", "Output header " + (index + 1)
    );

    labelInput.addEventListener("input", () => {
      mapping.label = labelInput.value;
      renderPreview();
    });

    const buttons = makeNode("div", "", "mapping-buttons");

    buttons.append(
      makeButton("↑", () => moveMapping(index, -1), index === 0),
      makeButton("↓", () => moveMapping(index, 1),
        index === mappings.length - 1),
      makeButton("Remove", () => {
        mappings.splice(index, 1);
        refresh();
      })
    );

    item.append(position, select, labelInput, buttons);
    editor.appendChild(item);
  });
}

function renderPreview() {
  if (!context) return;

  const sources = mappings.map(m => m.col);
  const labels = mappings.map(m => normalize(m.label));

  const duplicateSources =
    new Set(sources).size !== sources.length;

  const duplicateLabels =
    new Set(labels).size !== labels.length;

  const blankLabels = mappings.some(m => !m.label.trim());

  const valid =
    mappings.length > 0 &&
    !duplicateSources &&
    !duplicateLabels &&
    !blankLabels &&
    context.formulaCount === 0;

    const exportButton = $("exportBtn");
  exportButton.disabled = !valid;

  const exportReasons = [];

  if (!mappings.length) {
    exportReasons.push("No selected columns");
  }

  if (duplicateSources) {
    exportReasons.push("Duplicate source columns");
  }

  if (duplicateLabels) {
    exportReasons.push("Duplicate output headers");
  }

  if (blankLabels) {
    exportReasons.push("Empty output header");
  }

  if (context.formulaCount > 0) {
    exportReasons.push(
      context.formulaCount + " formula cells detected"
    );
  }

  console.log("Neura-Sheet Export Validation", {
    valid,
    exportDisabled: exportButton.disabled,
    mappingCount: mappings.length,
    exportReasons
  });

  exportButton.title = valid
    ? "Export reordered Excel"
    : "Export blocked: " + exportReasons.join("; ");
  $("detectedCount").textContent = context.columns.length;
  $("matchedCount").textContent = mappings.length;
  $("missingCount").textContent =
    context.columns.length - new Set(sources).size;

  const problems = [];

  if (duplicateSources) problems.push("Duplicate source columns");
  if (duplicateLabels) problems.push("Duplicate output headers");
  if (blankLabels) problems.push("Empty output header");
  if (!mappings.length) problems.push("No selected columns");
  if (context.formulaCount) {
    problems.push(context.formulaCount + " formulas detected");
  }

  const missingRequests = context.unmatchedRequested || [];

  const mappingMessage = missingRequests.length
    ? "Could not confidently detect: " +
      missingRequests.join(", ") +
      ". Check the mapping before export."
    : "All requested columns matched.";

  $("mappingStatus").textContent =
    (problems.length
      ? "Review: " + problems.join("; ") + ". "
      : "Final mapping checked. ") +
    mappingMessage;

  $("status").textContent = valid
    ? "Ready to export selected columns."
    : "Resolve mapping issues before exporting.";

  const body = $("mappingResults");
  body.replaceChildren();

  mappings.forEach((mapping, index) => {
    const source = context.columns.find(
      column => column.col === mapping.col
    );

    addTableRow(body, [
      index + 1,
      mapping.label,
      source?.name ?? "Unknown",
      sources.filter(c => c === mapping.col).length > 1
        ? "Duplicate"
        : "Selected"
    ]);
  });

  const table = $("previewTable");
  table.replaceChildren();

  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  addTableRow(thead, mappings.map(m => m.label), true);

  const last = Math.min(
    context.range.e.r,
    context.headerRow + 8
  );

  for (let row = context.headerRow + 1; row <= last; row++) {
    addTableRow(tbody, mappings.map(mapping => {
      const cell = cellAt(context.ws, row, mapping.col);
      return cell?.w ?? cell?.v ?? "";
    }));
  }

  table.append(thead, tbody);

  $("previewInfo").textContent =
    "Smart Auto-Mapping v1.2 — " + mappings.length +
    " columns. " +
    (context.suggestions?.length || 0) +
    " suggested matches. First 8 data rows shown.";
}

function refresh() {
  renderEditor();
  renderPreview();
}

function exportWorkbook() {
  if (!context || $("exportBtn").disabled) return;

  const approved = confirm(
    "Export a new Excel workbook?\n\n" +
    "Only selected worksheet data and columns will be included.\n" +
    "Original file remains unchanged."
  );

  if (!approved) return;

  try {
    const output = XLSX.utils.book_new();
    const sheet = {};

    mappings.forEach((mapping, col) => {
      sheet[XLSX.utils.encode_cell({r:0,c:col})] = {
        t: "s", v: mapping.label.trim()
      };

      for (
        let row = context.headerRow + 1;
        row <= context.range.e.r;
        row++
      ) {
        const source = cellAt(context.ws, row, mapping.col);
        if (!source || source.v == null) continue;

        const address = XLSX.utils.encode_cell({
          r: row - context.headerRow,
          c: col
        });

        const target = {
          t: source.t,
          v: source.v
        };

        if (source.z) target.z = source.z;
        sheet[address] = target;
      }
    });

    sheet["!ref"] = XLSX.utils.encode_range({
      s: {r:0,c:0},
      e: {
        r: context.range.e.r - context.headerRow,
        c: mappings.length - 1
      }
    });

    XLSX.utils.book_append_sheet(
      output, sheet, "Fixed Columns"
    );

    const base = filename.replace(/\.(xlsx|xls)$/i, "");

    XLSX.writeFile(
      output,
      base + "_NeuraSheet_Columns_Fixed.xlsx",
      {bookType:"xlsx",compression:true}
    );

    $("status").textContent =
      "Export complete. Review the downloaded Excel file.";

  } catch (error) {
    $("status").textContent =
      "Export failed: " + error.message;
  }
}

ensureEditor();

$("fileInput").addEventListener("change", loadFile);
$("analyzeBtn").addEventListener("click", analyze);
$("exportBtn").addEventListener("click", exportWorkbook);

$("preset").addEventListener("change", () => {
  $("desiredOrder").value = presets[$("preset").value];
  reset("Preset changed. Analyze again.");
});

["sheetSelect", "headerRow", "desiredOrder"].forEach(id => {
  $(id).addEventListener(
    id === "desiredOrder" ? "input" : "change",
    () => reset("Configuration changed. Analyze again.")
  );
});

console.log("Neura-Sheet Smart Column Fixer v1.1 loaded");




