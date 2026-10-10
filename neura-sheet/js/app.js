"use strict";

const $ = id => document.getElementById(id);
let report = [];

function addRow(values) {
  const tr = document.createElement("tr");
  values.forEach(value => {
    const td = document.createElement("td");
    td.textContent = String(value ?? "");
    tr.appendChild(td);
  });
  $("results").appendChild(tr);
}

function issue(sheet, cell, kind, detail) {
  report.push({ sheet, cell, kind, detail });
}

function detectFormulas(ws, sheetName) {
  if (!ws["!ref"]) return 0;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  let count = 0;

  for (let col = range.s.c; col <= range.e.c; col++) {
    const formulas = [];

    for (let row = range.s.r; row <= range.e.r; row++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = ws[address];

      if (cell && typeof cell.f === "string") {
        count++;
        formulas.push(row);

        if (/#REF!|#DIV\/0!|#NAME\?|#VALUE!|#N\/A|#NUM!|#NULL!/.test(cell.f)) {
          issue(sheetName, address, "Formula error", cell.f);
        }
      }

      if (cell && cell.t === "e") {
        issue(sheetName, address, "Excel error value", cell.w || cell.v);
      }
    }

    // Detect empty gaps surrounded by formula cells in the same column.
    if (formulas.length < 2) continue;

    const formulaRows = new Set(formulas);
    for (let row = formulas[0] + 1; row < formulas[formulas.length - 1]; row++) {
      if (!formulaRows.has(row) &&
          formulaRows.has(row - 1) &&
          formulaRows.has(row + 1)) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[address] || ws[address].v === undefined || ws[address].v === "") {
          issue(sheetName, address, "Possible missing formula",
            "Empty cell between two formula cells in the same column.");
        }
      }
    }
  }
  return count;
}

async function analyze() {
  const file = $("fileInput").files[0];
  if (!file) {
    $("status").textContent = "Please select an Excel file.";
    return;
  }

  if (typeof XLSX === "undefined") {
    $("status").textContent = "Excel library unavailable. Check your internet connection.";
    return;
  }

  $("status").textContent = "Analyzing workbook...";
  report = [];
  $("exportBtn").disabled = true;

  try {
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array", cellFormula: true });
    let formulaCount = 0;

    workbook.SheetNames.forEach(name => {
      formulaCount += detectFormulas(workbook.Sheets[name], name);
    });

    $("totalSheets").textContent = workbook.SheetNames.length;
    $("totalFormulas").textContent = formulaCount;
    $("totalIssues").textContent = report.length;

    $("results").replaceChildren();
    if (report.length) {
      report.forEach(r => addRow([r.sheet, r.cell, r.kind, r.detail]));
    } else {
      addRow(["—", "—", "No detected issues", "Checks completed."]);
    }

    $("status").textContent = "Analysis complete. Original file unchanged.";
    $("exportBtn").disabled = false;
  } catch (error) {
    $("status").textContent = "Unable to read workbook: " + error.message;
  }
}

$("analyzeBtn").addEventListener("click", analyze);

$("exportBtn").addEventListener("click", () => {
  const rows = report.length ? report : [{
    sheet: "—", cell: "—", kind: "No detected issues", detail: "Checks completed"
  }];
  const csv = [
    ["Sheet", "Cell", "Issue", "Details"],
    ...rows.map(r => [r.sheet, r.cell, r.kind, r.detail])
  ].map(row => row.map(value =>
    '"' + String(value).replace(/^[\s]*[=+\-@]/, "'$&").replace(/"/g, '""') + '"'
  ).join(",")).join("\r\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "sheetfix-formula-report.csv";
  link.click();
  URL.revokeObjectURL(url);
});
