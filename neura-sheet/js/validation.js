"use strict";

(() => {
  const $ = id => document.getElementById(id);

  let workbook = null;
  let fileName = "";
  let scan = null;

  const RULES = [
    ["none", "No validation"],
    ["email", "Email Address"],
    ["phone", "Phone Number"],
    ["date", "Date (YYYY-MM-DD or MM/DD/YYYY)"],
    ["number", "Number"],
    ["positive", "Non-negative Number"]
  ];

  function at(ws, r, c) {
    return ws[XLSX.utils.encode_cell({ r, c })];
  }

  function reset() {
    scan = null;
    $("verifyBtn").disabled = true;
    $("exportBtn").disabled = true;
    $("totalRows").textContent = "0";
    $("issueCount").textContent = "0";
    $("remainingCount").textContent = "0";
    $("resultInfo").textContent = "No analysis yet.";
    $("results").replaceChildren();
  }

  function isBlank(value) {
    return value == null ||
      (typeof value === "string" && value.trim() === "");
  }

  function guessRule(header) {
    const name = String(header).toLowerCase();

    if (/e.?mail/.test(name)) return "email";
    if (/phone|mobile|contact number|cellphone/.test(name))
      return "phone";
    if (/date|birthday|dob/.test(name)) return "date";
    if (/amount|salary|total|price|cost|balance/.test(name))
      return "number";

    return "none";
  }

  function validateDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return true;
    }

    if (typeof value === "number") {
      // Excel numeric dates use day serial numbers.
      return Number.isFinite(value) && value >= 1 && value <= 2958465;
    }

    const text = String(value).trim();

    let year, month, day;
    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else {
      match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

      if (!match) return false;

      month = Number(match[1]);
      day = Number(match[2]);
      year = Number(match[3]);
    }

    if (year < 1900 || year > 9999) return false;

    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
  }

  function parseNumber(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const text = String(value).trim();

    // Reject currency symbols and ambiguous separators.
    if (!/^-?(?:\d+|\d+\.\d+)$/.test(text)) return null;

    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function checkValue(value, rule, cell) {
    if (isBlank(value)) return null;

    const text = String(value).trim();

    if (rule === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return "Invalid email format";
      }
    }

    if (rule === "phone") {
      const digits = text.replace(/\D/g, "");

      if (!/^\+?[\d\s().-]+$/.test(text) ||
          digits.length < 7 || digits.length > 15) {
        return "Invalid or suspicious phone number";
      }
    }

    if (rule === "date") {
      // Don't treat any plain number as a date unless the
      // original Excel cell has date-like formatting.
      const formattedDate = cell &&
        /[dmy]/i.test(String(cell.z || ""));

      if (typeof value === "number" && !formattedDate) {
        return "Numeric value is not date-formatted";
      }

      if (!validateDate(value)) return "Invalid date";
    }

    if (rule === "number" || rule === "positive") {
      const number = parseNumber(value);

      if (number === null) return "Not a valid number";

      if (rule === "positive" && number < 0) {
        return "Negative value not allowed";
      }
    }

    return null;
  }

  function getRules() {
    return [...document.querySelectorAll(".column-rule")]
      .filter(select => select.value !== "none")
      .map(select => ({
        col: Number(select.dataset.column),
        rule: select.value,
        field: select.dataset.field
      }));
  }

  function loadRules() {
    reset();
    $("rulesContainer").replaceChildren();

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

    for (let c = range.s.c; c <= range.e.c; c++) {
      const letter = XLSX.utils.encode_col(c);
      const header = String(at(ws, row, c)?.v ?? "").trim() ||
        "Column " + letter;

      const label = document.createElement("label");
      label.className = "rule-item";

      const name = document.createElement("span");
      name.className = "rule-name";
      name.textContent = letter + " — " + header;

      const select = document.createElement("select");
      select.className = "column-rule";
      select.dataset.column = String(c);
      select.dataset.field = header;

      for (const [value, title] of RULES) {
        select.appendChild(new Option(title, value));
      }

      select.value = guessRule(header);
      label.append(name, select);
      $("rulesContainer").appendChild(label);
    }

    $("status").textContent = "Review the suggested validation rules.";
  }

  async function loadFile() {
    reset();
    workbook = null;

    $("sheetSelect").disabled = true;
    $("sheetSelect").replaceChildren();
    $("rulesContainer").replaceChildren();

    const file = $("fileInput").files[0];

    if (!file || !/\.(xlsx|xls)$/i.test(file.name)) {
      $("fileStatus").textContent = "Select an Excel workbook.";
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
        cellNF: true,
        cellDates: false
      });

      fileName = file.name;

      workbook.SheetNames.forEach(name =>
        $("sheetSelect").appendChild(new Option(name, name))
      );

      $("sheetSelect").disabled = false;
      $("fileStatus").textContent = fileName + " loaded.";
      loadRules();
    } catch (error) {
      workbook = null;
      $("fileStatus").textContent = "Read failed: " + error.message;
    }
  }

  function populatedRows(ws, header) {
    const rows = new Set();

    for (const [address, cell] of Object.entries(ws)) {
      if (address.startsWith("!") || !cell) continue;

      const loc = XLSX.utils.decode_cell(address);

      if (loc.r > header &&
          (cell.v != null || cell.f != null)) {
        rows.add(loc.r);
      }
    }

    return [...rows].sort((a, b) => a - b);
  }

  function displayIssue(item) {
    const tr = document.createElement("tr");

    const values = [
      item.address,
      item.field,
      item.rule,
      String(item.original),
      item.problem
    ];

    values.forEach(value => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });

    const inputCell = document.createElement("td");
    const input = document.createElement("input");

    input.className = "validation-input";
    input.type = "text";
    input.placeholder = "Correct value";
    input.value = item.correction;

    input.addEventListener("input", () => {
      item.correction = input.value;
      item.verified = false;
      $("exportBtn").disabled = true;
      item.status.textContent = "Not verified";
      item.status.className = "validation-pending";
      $("status").textContent = "Corrections changed. Verify again.";
    });

    inputCell.appendChild(input);
    tr.appendChild(inputCell);

    const statusCell = document.createElement("td");
    statusCell.textContent = "Not corrected";
    statusCell.className = "validation-pending";

    item.status = statusCell;

    tr.appendChild(statusCell);
    $("results").appendChild(tr);
  }

  function analyze() {
    reset();

    if (!workbook) {
      $("status").textContent = "Upload a workbook first.";
      return;
    }

    const name = $("sheetSelect").value;
    const ws = workbook.Sheets[name];

    if (!ws?.["!ref"]) return;

    const range = XLSX.utils.decode_range(ws["!ref"]);
    const header = Number($("headerRow").value) - 1;

    if (!Number.isSafeInteger(header) ||
        header < range.s.r || header > range.e.r) {
      $("status").textContent = "Invalid header row.";
      return;
    }

    const rules = getRules();

    if (!rules.length) {
      $("status").textContent = "Select at least one validation rule.";
      return;
    }

    const rows = populatedRows(ws, header);
    const issues = [];

    for (const row of rows) {
      for (const config of rules) {
        const cell = at(ws, row, config.col);

        // Formula cells are not manually replaced.
        if (cell?.f != null) continue;

        const value = cell?.v;
        const problem = checkValue(value, config.rule, cell);

        if (!problem) continue;

        issues.push({
          row,
          col: config.col,
          field: config.field,
          rule: config.rule,
          address: XLSX.utils.encode_cell({
            r: row, c: config.col
          }),
          original: value,
          problem,
          correction: "",
          verified: false,
          status: null
        });
      }
    }

    const formulas = Object.entries(ws).some(([address, cell]) =>
      !address.startsWith("!") &&
      cell?.f != null &&
      XLSX.utils.decode_cell(address).r >= header
    );

    scan = { name, ws, range, header, rows, issues, formulas };

    $("totalRows").textContent = rows.length;
    $("issueCount").textContent = issues.length;
    $("remainingCount").textContent = issues.length;

    $("resultInfo").textContent =
      issues.length + " invalid values detected.";

    for (const item of issues) displayIssue(item);

    if (!issues.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.textContent = "No invalid values found under selected rules.";
      tr.appendChild(td);
      $("results").appendChild(tr);
    }

    $("verifyBtn").disabled = issues.length === 0;

    $("status").textContent = formulas
      ? "Analysis complete. Export blocked: formula cells detected."
      : "Analysis complete. Enter corrections and verify.";
  }

  function verify() {
    if (!scan) return;

    let corrected = 0;

    for (const item of scan.issues) {
      const value = item.correction.trim();

      const problem = checkValue(value, item.rule);

      item.verified = value !== "" && problem === null;

      if (item.verified) {
        corrected++;
        item.status.textContent = "Valid correction";
        item.status.className = "validation-ok";
      } else {
        item.status.textContent = value === ""
          ? "Still unresolved"
          : problem || "Invalid correction";
        item.status.className = "validation-error";
      }
    }

    const remaining = scan.issues.length - corrected;
    $("remainingCount").textContent = remaining;

    $("exportBtn").disabled = corrected === 0 || scan.formulas;

    $("status").textContent = scan.formulas
      ? "Export blocked: this worksheet contains formulas."
      : corrected + " corrections validated; " +
        remaining + " issues remain unresolved.";
  }

  function exportExcel() {
    if (!scan || $("exportBtn").disabled) return;

    const approved = scan.issues.filter(item => item.verified);

    if (!approved.length) return;

    if (!confirm(
      "Export a NEW corrected Excel workbook?\n\n" +
      approved.length + " valid corrections will be applied.\n" +
      "Other unresolved values remain unchanged.\n" +
      "Only the selected worksheet will be exported.\n" +
      "The original Excel workbook will not be modified."
    )) return;

    try {
      const grid = [];

      for (let r = scan.header; r <= scan.range.e.r; r++) {
        const row = [];

        for (let c = scan.range.s.c; c <= scan.range.e.c; c++) {
          row.push(at(scan.ws, r, c)?.v ?? null);
        }

        grid.push(row);
      }

      const audit = [[
        "Worksheet", "Cell", "Field",
        "Rule", "Previous Value", "Corrected Value"
      ]];

      for (const item of approved) {
        const r = item.row - scan.header;
        const c = item.col - scan.range.s.c;

        let value = item.correction.trim();

        if (item.rule === "number" ||
            item.rule === "positive") {
          value = Number(value);
        }

        grid[r][c] = value;

        audit.push([
          scan.name,
          item.address,
          item.field,
          item.rule,
          String(item.original),
          String(value)
        ]);
      }

      const output = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        output,
        XLSX.utils.aoa_to_sheet(grid),
        "Validated Data"
      );

      XLSX.utils.book_append_sheet(
        output,
        XLSX.utils.aoa_to_sheet(audit),
        "Validation Audit"
      );

      const base = fileName.replace(/\.(xlsx|xls)$/i, "");

      XLSX.writeFile(
        output,
        base + "_NeuraSheet_Validated.xlsx",
        { bookType: "xlsx", compression: true }
      );

      $("status").textContent =
        "Export complete. Review the corrected workbook in Excel.";
    } catch (error) {
      $("status").textContent = "Export failed: " + error.message;
    }
  }

  $("fileInput").addEventListener("change", loadFile);
  $("sheetSelect").addEventListener("change", loadRules);
  $("headerRow").addEventListener("change", loadRules);
  $("rulesContainer").addEventListener("change", reset);

  $("analyzeBtn").addEventListener("click", analyze);
  $("verifyBtn").addEventListener("click", verify);
  $("exportBtn").addEventListener("click", exportExcel);

  console.log("Neura-Sheet Data Validation Checker v1.0 loaded");
})();

