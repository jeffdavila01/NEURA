"use strict";

const $ = id => document.getElementById(id);

let workbook = null;
let filename = "";
let scan = null;

function cellAt(ws, row, col) {
  return ws[XLSX.utils.encode_cell({r:row,c:col})];
}

function blank(cell) {
  if (!cell) return true;
  if (cell.f != null) return false;
  if (cell.v == null) return true;
  return typeof cell.v === "string" && cell.v.trim() === "";
}

function clearResults() {
  scan = null;
  $("verifyBtn").disabled = true;
  $("exportBtn").disabled = true;
  $("totalRows").textContent = "0";
  $("missingCount").textContent = "0";
  $("remainingCount").textContent = "0";
  $("resultInfo").textContent = "No analysis yet.";
  $("results").replaceChildren();
}

function loadColumns() {
  clearResults();
  $("requiredColumns").replaceChildren();
  if (!workbook) return;

  const ws = workbook.Sheets[$("sheetSelect").value];
  if (!ws?.["!ref"]) return;

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const row = Number($("headerRow").value) - 1;

  if (!Number.isSafeInteger(row) ||
      row < range.s.r || row > range.e.r) {
    $("status").textContent = "Invalid header row.";
    return;
  }

  for (let c=range.s.c;c<=range.e.c;c++) {
    const address = XLSX.utils.encode_col(c);
    const name = String(cellAt(ws,row,c)?.v ?? "").trim()
      || "Column " + address;

    const label = document.createElement("label");
    label.className = "required-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "requiredField";
    checkbox.value = c;

    // Required fields must be chosen by the user.
    const span = document.createElement("span");
    span.textContent = address + " — " + name;

    label.append(checkbox, span);
    $("requiredColumns").appendChild(label);
  }

  $("status").textContent = "Select required columns and analyze.";
}

async function loadFile() {
  workbook = null;
  clearResults();

  $("sheetSelect").replaceChildren();
  $("sheetSelect").disabled = true;
  $("requiredColumns").replaceChildren();

  const file = $("fileInput").files[0];

  if (!file || !/\.(xlsx|xls)$/i.test(file.name)) {
    $("fileStatus").textContent = "Select an Excel file.";
    return;
  }

  if (typeof XLSX === "undefined") {
    $("fileStatus").textContent = "Excel library unavailable.";
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

    workbook.SheetNames.forEach(name => {
      $("sheetSelect").appendChild(new Option(name,name));
    });

    $("sheetSelect").disabled = false;
    $("fileStatus").textContent =
      filename + " — " + workbook.SheetNames.length + " sheets.";

    loadColumns();
  } catch (error) {
    workbook = null;
    $("fileStatus").textContent = "Read failed: " + error.message;
  }
}

function addResult(item) {
  const tr = document.createElement("tr");

  const text = [
    item.row + 1,
    item.address,
    item.field,
    item.original || "(blank)"
  ];

  for (const value of text) {
    const td = document.createElement("td");
    td.textContent = String(value);
    tr.appendChild(td);
  }

  const td = document.createElement("td");
  const input = document.createElement("input");
  input.className = "correction-input";
  input.type = "text";
  input.placeholder = "Enter correct value";
  input.value = item.correction;

  input.addEventListener("input", () => {
    item.correction = input.value;
    $("exportBtn").disabled = true;
    $("status").textContent =
      "Corrections changed. Click Verify Corrections again.";
  });

  td.appendChild(input);
  tr.appendChild(td);
  $("results").appendChild(tr);
}

function analyze() {
  clearResults();

  if (!workbook) {
    $("status").textContent = "Upload a workbook first.";
    return;
  }

  const sheetName = $("sheetSelect").value;
  const ws = workbook.Sheets[sheetName];

  if (!ws?.["!ref"]) return;

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const header = Number($("headerRow").value) - 1;

  if (!Number.isSafeInteger(header) ||
      header < range.s.r || header > range.e.r) {
    $("status").textContent = "Invalid header row.";
    return;
  }

  const columns = [...document.querySelectorAll(
    'input[name="requiredField"]:checked'
  )].map(input => Number(input.value));

  if (!columns.length) {
    $("status").textContent = "Select at least one required field.";
    return;
  }

  const populated = new Set();

  for (const [address, cell] of Object.entries(ws)) {
    if (address.startsWith("!") || !cell) continue;
    const r = XLSX.utils.decode_cell(address).r;
    if (r > header && (cell.f != null ||
        (cell.v != null && String(cell.v).trim() !== ""))) {
      populated.add(r);
    }
  }

  const rows = [...populated].sort((a,b) => a-b);
  const issues = [];

  for (const row of rows) {
    for (const col of columns) {
      const cell = cellAt(ws,row,col);
      if (!blank(cell)) continue;

      const address = XLSX.utils.encode_cell({r:row,c:col});
      const field = String(cellAt(ws,header,col)?.v ?? address);

      issues.push({
        row, col, address, field,
        original: String(cell?.v ?? ""),
        correction: ""
      });
    }
  }

  const formulas = Object.entries(ws).some(([address,cell]) =>
    !address.startsWith("!") &&
    cell?.f != null &&
    XLSX.utils.decode_cell(address).r >= header
  );

  scan = {sheetName, ws, range, header, rows, issues, formulas};

  $("totalRows").textContent = rows.length;
  $("missingCount").textContent = issues.length;
  $("remainingCount").textContent = issues.length;
  $("resultInfo").textContent =
    issues.length + " missing required values found.";

  for (const item of issues) addResult(item);

  if (!issues.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "No missing values in selected required fields.";
    tr.appendChild(td);
    $("results").appendChild(tr);
  }

  $("verifyBtn").disabled = issues.length === 0;

  $("status").textContent = formulas
    ? "Analysis complete. Export blocked because formulas were detected."
    : "Analysis complete. Enter corrections, then verify.";
}

function verify() {
  if (!scan) return;

  const corrected = scan.issues.filter(item =>
    item.correction.trim().length > 0
  );

  const remaining = scan.issues.length - corrected.length;
  $("remainingCount").textContent = remaining;

  $("exportBtn").disabled =
    scan.formulas || corrected.length === 0;

  $("status").textContent = scan.formulas
    ? "Export blocked: formula cells exist in this worksheet."
    : corrected.length + " corrections approved; " +
      remaining + " fields remain missing. " +
      "Only completed corrections will be applied.";
}

function exportExcel() {
  if (!scan || $("exportBtn").disabled) return;

  const corrected = scan.issues.filter(item =>
    item.correction.trim()
  );

  if (!corrected.length) return;

  if (!confirm(
    "Export a NEW Excel data-only workbook?\n\n" +
    corrected.length + " missing fields will be filled.\n" +
    "Other missing fields will remain blank.\n" +
    "Original workbook will not be changed."
  )) return;

  try {
    const grid = [];

    for (let r=scan.header;r<=scan.range.e.r;r++) {
      const row = [];

      for (let c=scan.range.s.c;c<=scan.range.e.c;c++) {
        const cell = cellAt(scan.ws,r,c);
        row.push(cell?.v ?? null);
      }

      grid.push(row);
    }

    for (const item of corrected) {
      const row = item.row - scan.header;
      const col = item.col - scan.range.s.c;
      grid[row][col] = item.correction.trim();
    }

    const output = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      output,
      XLSX.utils.aoa_to_sheet(grid),
      "Corrected Data"
    );

    const audit = [[
      "Original Worksheet", "Cell", "Field", "Old Value", "New Value"
    ]];

    corrected.forEach(item => audit.push([
      scan.sheetName, item.address, item.field,
      item.original, item.correction.trim()
    ]));

    XLSX.utils.book_append_sheet(
      output,
      XLSX.utils.aoa_to_sheet(audit),
      "Correction Audit"
    );

    const base = filename.replace(/\.(xlsx|xls)$/i,"");
    XLSX.writeFile(
      output,
      base + "_NeuraSheet_MissingData_Fixed.xlsx",
      {bookType:"xlsx", compression:true}
    );

    $("status").textContent =
      "Export complete. Verify the corrected workbook in Excel.";
  } catch(error) {
    $("status").textContent = "Export failed: " + error.message;
  }
}

$("fileInput").addEventListener("change",loadFile);
$("sheetSelect").addEventListener("change",loadColumns);
$("headerRow").addEventListener("change",loadColumns);
$("requiredColumns").addEventListener("change",clearResults);
$("analyzeBtn").addEventListener("click",analyze);
$("verifyBtn").addEventListener("click",verify);
$("exportBtn").addEventListener("click",exportExcel);

console.log("Neura-Sheet Missing Data Checker v1.0 loaded");

