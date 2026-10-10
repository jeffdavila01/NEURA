"use strict";

const $ = id => document.getElementById(id);
let report = [];
let summary = [];

function numberFromCell(cell) {
  if (!cell || cell.v === "" || cell.v == null) return 0;
  if (typeof cell.v === "number") return cell.v;
  const text = String(cell.v).replace(/[,$₱\s]/g, "").trim();
  const normalized = /^\(.*\)$/.test(text) ? "-" + text.slice(1, -1) : text;
  if (!normalized) return 0;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}

function addRow(values) {
  const tr = document.createElement("tr");
  values.forEach(value => {
    const td = document.createElement("td");
    td.textContent = String(value ?? "");
    tr.appendChild(td);
  });
  $("results").appendChild(tr);
}

function format(value) {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function inspectSheet(ws, sheetName) {
  if (!ws["!ref"]) return null;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  let headerRow = -1, debitCol = -1, creditCol = -1;

  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 19); r++) {
    let d = -1, c = -1;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r, c: col });
      const label = String(ws[address]?.v ?? "").trim().toLowerCase();
      if (/^(debit|debits|dr)$/.test(label)) d = col;
      if (/^(credit|credits|cr)$/.test(label)) c = col;
    }
    if (d !== -1 && c !== -1) {
      headerRow = r;
      debitCol = d;
      creditCol = c;
      break;
    }
  }

  if (headerRow === -1) return null;

  let debit = 0, credit = 0, validRows = 0;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const dc = ws[XLSX.utils.encode_cell({ r, c: debitCol })];
    const cc = ws[XLSX.utils.encode_cell({ r, c: creditCol })];

    if (!dc && !cc) continue;

    const d = numberFromCell(dc);
    const c = numberFromCell(cc);
    const rowNumber = r + 1;

    if (!Number.isFinite(d) || !Number.isFinite(c)) {
      report.push({
        sheet: sheetName, row: rowNumber,
        debit: dc?.v ?? "", credit: cc?.v ?? "",
        diagnosis: "Invalid numeric value; review source cells."
      });
      continue;
    }

    debit += d;
    credit += c;
    validRows++;

    // A single journal line often has EITHER a debit OR a credit.
    // Do not treat every individual row as an unbalanced transaction.
    if (d !== 0 && c !== 0) {
      report.push({
        sheet: sheetName, row: rowNumber,
        debit: d, credit: c,
        diagnosis: "Both columns have amounts; review if expected."
      });
    }
  }

  const candidates = window.Neura-SheetDiagnostics.findBalanceCandidates(
    ws,
    debitCol,
    creditCol,
    headerRow,
    range,
    debit - credit
  );

  for (const candidate of candidates) {
    report.push({
      sheet: sheetName,
      row: candidate.row,
      debit: candidate.cell,
      credit: candidate.amount,
      diagnosis: candidate.reason
    });
  }

  return { sheet: sheetName, debit, credit, validRows };
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

  report = [];
  summary = [];
  $("exportBtn").disabled = true;
  $("status").textContent = "Checking workbook...";

  try {
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array" });
    for (const name of workbook.SheetNames) {
      const result = inspectSheet(workbook.Sheets[name], name);
      if (result) summary.push(result);
    }

    if (!summary.length) {
      $("status").textContent = "No sheets with Debit and Credit headers found.";
      $("balanceMessage").textContent = "Use columns headed Debit and Credit.";
      $("totalDebit").textContent = "0.00";
      $("totalCredit").textContent = "0.00";
      $("difference").textContent = "0.00";
      $("results").replaceChildren();
      addRow(["—", "—", "—", "—", "Required columns not found."]);
      return;
    }

    const totalD = summary.reduce((sum, s) => sum + s.debit, 0);
    const totalC = summary.reduce((sum, s) => sum + s.credit, 0);
    const diff = totalD - totalC;

    $("totalDebit").textContent = format(totalD);
    $("totalCredit").textContent = format(totalC);
    $("difference").textContent = format(diff);

    const balanced = Math.abs(diff) < 0.005;
    $("balanceMessage").textContent = balanced
      ? "Total debits and credits match within 0.01. This does not verify every transaction."
      : "Debit and credit totals differ by " + format(Math.abs(diff)) +
        ". Review the per-sheet differences and source entries.";

    $("results").replaceChildren();
    summary.forEach(s => {
      const difference = s.debit - s.credit;
      addRow([
        s.sheet, "All",
        format(s.debit), format(s.credit),
        Math.abs(difference) < 0.005
          ? "Sheet totals match."
          : "Sheet difference: " + format(difference)
      ]);
    });

    report.forEach(r => addRow([
      r.sheet, r.row, r.debit, r.credit, r.diagnosis
    ]));

    $("status").textContent = "Balance analysis complete. Original file unchanged.";
    $("exportBtn").disabled = false;
  } catch (error) {
    $("status").textContent = "Unable to read workbook: " + error.message;
  }
}

$("analyzeBtn").addEventListener("click", analyze);

$("exportBtn").addEventListener("click", () => {
  const rows = [
    ["Sheet", "Row", "Debit", "Credit", "Diagnosis"],
    ...summary.map(s => [
      s.sheet, "All", s.debit, s.credit,
      "Difference: " + (s.debit - s.credit)
    ]),
    ...report.map(r => [r.sheet, r.row, r.debit, r.credit, r.diagnosis])
  ];

  const csv = rows.map(row => row.map(value =>
    '"' + String(value).replace(/^[\s]*[=+\-@]/, "'$&").replace(/"/g, '""') + '"'
  ).join(",")).join("\r\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "sheetfix-balance-report.csv";
  link.click();
  URL.revokeObjectURL(url);
});


