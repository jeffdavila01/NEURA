"use strict";

(() => {
  const $ = id => document.getElementById(id);
  let workbook = null;

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "investigationPanel";
  panel.style.marginTop = "20px";

  panel.innerHTML = `
    <h2>Formula Investigation</h2>
    <p class="muted">
      Investigate a specific worksheet and cell.
      Analysis is read-only.
    </p>

    <div class="investigation-controls">
      <label>
        Worksheet
        <select id="investigationSheet">
          <option value="">Upload workbook first</option>
        </select>
      </label>

      <label>
        Cell Address
        <input
          id="investigationCell"
          type="text"
          placeholder="Example: L6"
        >
      </label>

      <button type="button" id="investigateBtn">
        Investigate Cell
      </button>
    </div>

    <p id="investigationStatus"
       class="muted"
       role="status">
      Select a workbook and a cell to begin.
    </p>

    <div id="investigationDetails"></div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    .investigation-controls {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      align-items: end;
      margin: 20px 0;
    }

    .investigation-controls label {
      display: grid;
      gap: 7px;
      font-size: 13px;
      font-weight: 600;
      flex: 1;
      min-width: 160px;
    }

    .investigation-controls input,
    .investigation-controls select {
      width: 100%;
      border: 1px solid #dce3eb;
      border-radius: 8px;
      padding: 11px;
      background: white;
      color: #1b2838;
    }

    .investigation-card {
      background: #f7f9fc;
      border: 1px solid #dce3eb;
      border-radius: 10px;
      padding: 18px;
      margin-top: 14px;
    }

    .investigation-card h3 {
      margin: 0 0 12px;
      font-size: 16px;
    }

    .investigation-code {
      display: block;
      background: #172538;
      color: #e6edf5;
      padding: 15px;
      border-radius: 8px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-family: Consolas, monospace;
      font-size: 13px;
    }

    .investigation-card p {
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .investigation-card table {
      min-width: 400px;
    }
  `;

  document.head.appendChild(style);
  document.querySelector("main")?.appendChild(panel);

  function element(tag, text, className = "") {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function makeCard(title, content, code = false) {
    const card = element("div", "");
    card.className = "investigation-card";
    card.appendChild(element("h3", title));

    if (code) {
      card.appendChild(element("code", content, "investigation-code"));
    } else {
      card.appendChild(element("p", content));
    }

    $("investigationDetails").appendChild(card);
    return card;
  }

  function describeCell(cell) {
    if (!cell) return "Blank cell";

    if (cell.t === "e") {
      return "Excel error: " + String(cell.w ?? cell.v);
    }

    const raw = cell.v == null ? "(empty)" : String(cell.v);
    const formatted = cell.w != null ? String(cell.w) : raw;

    if (cell.f) {
      return "Stored value: " + formatted +
        " | Formula: =" + cell.f;
    }

    return "Value: " + formatted +
      " | Type: " + String(cell.t ?? "unknown") +
      (cell.z ? " | Format: " + cell.z : "");
  }

  function getReferences(formula, ws) {
    // Basic same-sheet A1 reference extraction.
    // Not a complete Excel formula parser.
    const clean = formula
      .replace(/"(?:[^"]|"")*"/g, '""')
      .replace(/'(?:[^']|'')+'!/g, "EXTERNAL!")
      .replace(/(?:\[[^\]]+\])?[A-Za-z_][\w.]*!/g, "EXTERNAL!");

    const matches = [
      ...clean.matchAll(
        /(?<![A-Z0-9_.])(\$?[A-Z]{1,3}\$?[1-9]\d{0,6})(?![A-Z0-9_.])/gi
      )
    ];

    const refs = [...new Set(
      matches.map(match =>
        match[1].replace(/\$/g, "").toUpperCase()
      )
    )];

    return refs.slice(0, 30).map(address => ({
      address,
      cell: ws[address]
    }));
  }

  function diagnose(cell, refs) {
    const formula = cell.f || "";
    const reasons = [];
    const actions = [];

    if (cell.t === "e") {
      reasons.push("The workbook stores an Excel error for this cell.");
      actions.push(
        "Check the formula, dependencies and error propagation."
      );
    }

    if (/#REF!/i.test(formula)) {
      reasons.push("Formula contains a broken reference token.");
      actions.push(
        "Find the deleted or moved referenced cells or worksheet."
      );
    }

    if (/GOOGLEFINANCE|__xludf\.DUMMYFUNCTION/i.test(formula)) {
      reasons.push(
        "Formula uses Google Sheets functionality or an Excel compatibility wrapper."
      );
      actions.push(
        "Check the calculation in its original spreadsheet application."
      );
    }

    if (/NETWORKDAYS\s*\(/i.test(formula)) {
      const formattedAsMoneyOrPercent = refs.filter(ref =>
        /[%$£€₱]/.test(String(ref.cell?.z ?? ""))
      );

      if (formattedAsMoneyOrPercent.length) {
        reasons.push(
          "Date function references cells formatted as currency or percentage: " +
          formattedAsMoneyOrPercent.map(r => r.address).join(", ")
        );
        actions.push(
          "Verify that both NETWORKDAYS arguments are actual dates."
        );
      }
    }

    const errors = refs.filter(ref => ref.cell?.t === "e");
    if (errors.length) {
      reasons.push(
        "Referenced cells contain stored Excel errors: " +
        errors.map(ref => ref.address).join(", ")
      );
      actions.push(
        "Investigate those source cells before changing this formula."
      );
    }

    const blanks = refs.filter(ref => !ref.cell ||
      (ref.cell.v == null && !ref.cell.f));

    if (blanks.length) {
      reasons.push(
        "Some directly referenced cells are blank: " +
        blanks.map(ref => ref.address).join(", ")
      );
      actions.push(
        "Confirm whether those blank inputs are intentional."
      );
    }

    if (!reasons.length) {
      reasons.push(
        "No definitive issue found by the supported diagnostic rules."
      );
      actions.push(
        "Compare the formula with the intended business calculation."
      );
    }

    return { reasons, actions };
  }

  function investigate() {
    const sheetName = $("investigationSheet").value;
    const address = $("investigationCell")
      .value.trim().replace(/\$/g, "").toUpperCase();

    const details = $("investigationDetails");
    details.replaceChildren();

    if (!workbook) {
      $("investigationStatus").textContent =
        "Upload and analyze a workbook first.";
      return;
    }

    if (!sheetName || !/^[A-Z]{1,3}[1-9]\d{0,6}$/.test(address)) {
      $("investigationStatus").textContent =
        "Select a worksheet and enter a valid cell address.";
      return;
    }

    const ws = workbook.Sheets[sheetName];
    const cell = ws?.[address];

    if (!cell) {
      $("investigationStatus").textContent =
        sheetName + "!" + address + " is blank.";
      return;
    }

    $("investigationStatus").textContent =
      "Investigation completed: " + sheetName + "!" + address;

    makeCard(
      "Original Cell Information",
      describeCell(cell)
    );

    if (!cell.f) {
      makeCard(
        "Formula Status",
        "This cell does not contain a stored formula. " +
        "It may be a manual input, calculated value, or an intentional blank."
      );
      return;
    }

    makeCard(
      "Original Formula",
      "=" + cell.f,
      true
    );

    const refs = getReferences(cell.f, ws);

    const refCard = makeCard(
      "Direct Cell References",
      refs.length
        ? "Detected same-sheet references are listed below."
        : "No direct same-sheet A1 references detected."
    );

    if (refs.length) {
      const wrap = element("div", "");
      wrap.className = "table-wrap";

      const table = document.createElement("table");
      const head = document.createElement("thead");
      const headerRow = document.createElement("tr");

      ["Cell", "Stored Value / Type"].forEach(value => {
        headerRow.appendChild(element("th", value));
      });

      head.appendChild(headerRow);
      table.appendChild(head);

      const body = document.createElement("tbody");

      refs.forEach(ref => {
        const row = document.createElement("tr");
        row.appendChild(element("td", ref.address));
        row.appendChild(element("td", describeCell(ref.cell)));
        body.appendChild(row);
      });

      table.appendChild(body);
      wrap.appendChild(table);
      refCard.appendChild(wrap);
    }

    const result = diagnose(cell, refs);

    makeCard(
      "Possible Root Causes",
      result.reasons.join("\n")
    ).lastChild.style.whiteSpace = "pre-line";

    makeCard(
      "Recommended Actions",
      result.actions.join("\n")
    ).lastChild.style.whiteSpace = "pre-line";

    makeCard(
      "Investigation Status",
      cell.t === "e"
        ? "Stored Excel error detected. Root cause still needs verification."
        : "Diagnostic review completed. Findings are not proof of an incorrect formula."
    );
  }

  async function loadWorkbook() {
    const file = $("fileInput")?.files?.[0];
    workbook = null;
    $("investigationDetails").replaceChildren();

    if (!file || typeof XLSX === "undefined") {
      $("investigationStatus").textContent =
        "Select a valid Excel workbook first.";
      return;
    }

    $("investigationStatus").textContent =
      "Loading workbook for investigation...";

    try {
      const bytes = await file.arrayBuffer();

      workbook = XLSX.read(bytes, {
        type: "array",
        cellFormula: true,
        cellNF: true,
        cellDates: false
      });

      const select = $("investigationSheet");
      select.replaceChildren();

      workbook.SheetNames.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });

      $("investigationStatus").textContent =
        "Workbook ready. Select a worksheet and cell.";
    } catch (error) {
      workbook = null;
      $("investigationStatus").textContent =
        "Unable to load workbook: " + error.message;
    }
  }

  $("analyzeBtn")?.addEventListener("click", loadWorkbook);

  $("fileInput")?.addEventListener("change", () => {
    workbook = null;
    $("investigationSheet").replaceChildren();
    $("investigationDetails").replaceChildren();
    $("investigationStatus").textContent =
      "New file selected. Click Analyze Trading File.";
  });

  $("investigateBtn").addEventListener("click", investigate);

  // Clicking a diagnostic row selects its first sample cell.
  $("diagnostics")?.addEventListener("click", event => {
    const row = event.target.closest("tr");
    if (!row || !workbook) return;

    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return;

    const sheetName = cells[0].textContent.trim();
    const match = cells[1].textContent.match(
      /\b[A-Z]{1,3}[1-9]\d{0,6}\b/i
    );

    if (!match || !workbook.Sheets[sheetName]) return;

    $("investigationSheet").value = sheetName;
    $("investigationCell").value = match[0];

    investigate();

    panel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
})();
