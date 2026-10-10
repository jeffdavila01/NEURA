"use strict";

(() => {
  const $ = id => document.getElementById(id);
  let workbook = null;
  let filename = "";
  let analysis = null;
  const MAX_PAIRS = 200;
  const MAX_COMPARISONS = 100000;

  const reviewPanel = document.createElement("section");
  reviewPanel.className = "panel review-panel";
  reviewPanel.innerHTML = `
    <h2>Smart Duplicate Review</h2>
    <p class="muted">
      Compare records and approve each removal.
      All matches default to Keep Both.
    </p>
    <div id="reviewSummary" class="review-summary">
      Analyze a workbook to begin.
    </div>
    <div id="reviewItems"></div>
  `;

  document.querySelector("main").appendChild(reviewPanel);

  function cellAt(ws, r, c) {
    return ws[XLSX.utils.encode_cell({ r, c })];
  }

  function normalize(cell) {
    if (!cell || cell.v == null) return "";

    const text = String(cell.v);

    if ($("normalizeText").checked && cell.t === "s") {
      return text.trim().replace(/\s+/g, " ").toLowerCase();
    }

    return text;
  }

  function cleanName(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function distance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);

    for (let i = 1; i <= a.length; i++) {
      let diagonal = row[0];
      row[0] = i;

      for (let j = 1; j <= b.length; j++) {
        const old = row[j];
        row[j] = Math.min(
          row[j] + 1,
          row[j - 1] + 1,
          diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        diagonal = old;
      }
    }

    return row[b.length];
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 100;
    return Math.round(
      (1 - distance(a, b) / Math.max(a.length, b.length)) * 100
    );
  }

  function nameSimilarity(a, b) {
    const x = cleanName(a);
    const y = cleanName(b);

    if (!x || !y) return 0;
    if (x === y) return 100;

    const xt = x.split(" ");
    const yt = y.split(" ");
    const full = similarity(x, y);

    if (xt.length >= 2 && yt.length >= 2) {
      const first = similarity(xt[0], yt[0]);
      const last = similarity(xt.at(-1), yt.at(-1));

      if (first >= 70 && last >= 70) {
        return Math.max(full, Math.round((first + last) / 2));
      }
    }

    return full;
  }

  function addTableRow(values) {
    const tr = document.createElement("tr");

    for (const value of values) {
      const td = document.createElement("td");
      td.textContent = String(value ?? "");
      tr.appendChild(td);
    }

    $("results").appendChild(tr);
  }

  function reset() {
    analysis = null;
    $("exportBtn").disabled = true;
    $("totalRows").textContent = "0";
    $("duplicateCount").textContent = "0";
    $("uniqueCount").textContent = "0";
    $("resultCount").textContent = "No analysis yet.";
    $("results").replaceChildren();
    $("reviewItems").replaceChildren();
    $("reviewSummary").textContent = "Analyze a workbook to begin.";
  }

  function setMode() {
    const mode = $("duplicateMode").value;

    const messages = {
      exact: "Compare selected matching columns.",
      key: "Find repeated identifiers and conflicting records.",
      fuzzy: "Find exact and similar names for manual review."
    };

    $("modeInfo").textContent = messages[mode];
    $("similaritySettings").style.display =
      mode === "fuzzy" ? "block" : "none";
  }

  function loadColumns() {
    reset();
    $("keyColumns").replaceChildren();
    if (!workbook) return;

    const ws = workbook.Sheets[$("sheetSelect").value];
    if (!ws?.["!ref"]) return;

    const range = XLSX.utils.decode_range(ws["!ref"]);
    const r = Number($("headerRow").value) - 1;

    if (!Number.isSafeInteger(r) ||
        r < range.s.r || r > range.e.r) {
      $("status").textContent = "Invalid header row.";
      return;
    }

    let preferred = null;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const name = String(cellAt(ws, r, c)?.v ?? "").trim()
        || "Column " + XLSX.utils.encode_col(c);

      const label = document.createElement("label");
      label.className = "key";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "duplicateKey";
      input.value = String(c);

      const text = document.createElement("span");
      text.textContent = XLSX.utils.encode_col(c) + " — " + name;

      if (!preferred && /\b(id|email|sku|name)\b/i.test(name)) {
        preferred = input;
      }

      label.append(input, text);
      $("keyColumns").appendChild(label);
    }

    if (preferred) preferred.checked = true;
    $("status").textContent = "Choose matching columns and scan.";
  }

  async function loadFile() {
    workbook = null;
    reset();

    $("sheetSelect").replaceChildren();
    $("sheetSelect").disabled = true;
    $("keyColumns").replaceChildren();

    const file = $("fileInput").files[0];

    if (!file || !/\.(xlsx|xls)$/i.test(file.name)) {
      $("fileStatus").textContent = "Select an Excel workbook.";
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

      for (const name of workbook.SheetNames) {
        $("sheetSelect").appendChild(new Option(name, name));
      }

      $("sheetSelect").disabled = false;
      $("fileStatus").textContent = filename + " loaded.";
      loadColumns();
    } catch (error) {
      workbook = null;
      $("fileStatus").textContent = "Read failed: " + error.message;
    }
  }

  function getPopulatedRows(ws, header) {
    const rows = new Set();

    for (const [address, cell] of Object.entries(ws)) {
      if (address.startsWith("!") || !cell) continue;
      if (cell.v == null && cell.f == null) continue;

      const r = XLSX.utils.decode_cell(address).r;
      if (r > header) rows.add(r);
    }

    return [...rows].sort((a, b) => a - b);
  }

  function rowValues(ws, row, range) {
    const values = [];

    for (let c = range.s.c; c <= range.e.c; c++) {
      values.push(normalize(cellAt(ws, row, c)));
    }

    return values;
  }

  function findDuplicates() {
    reset();

    if (!workbook) {
      $("status").textContent = "Upload a workbook first.";
      return;
    }

    const ws = workbook.Sheets[$("sheetSelect").value];

    if (!ws?.["!ref"]) {
      $("status").textContent = "Worksheet is empty.";
      return;
    }

    const range = XLSX.utils.decode_range(ws["!ref"]);
    const header = Number($("headerRow").value) - 1;

    if (!Number.isSafeInteger(header) ||
        header < range.s.r || header > range.e.r) {
      $("status").textContent = "Invalid header row.";
      return;
    }

    const cols = [...document.querySelectorAll(
      'input[name="duplicateKey"]:checked'
    )].map(el => Number(el.value)).sort((a, b) => a - b);

    if (!cols.length) {
      $("status").textContent = "Choose at least one matching column.";
      return;
    }

    const mode = $("duplicateMode").value;
    const rows = getPopulatedRows(ws, header);
    const matches = [];
    const seen = new Map();
    let incomplete = false;

    if (mode !== "fuzzy") {
      for (const row of rows) {
        const keys = cols.map(c => normalize(cellAt(ws, row, c)));

        if ($("skipEmpty").checked && keys.every(k => !k)) continue;

        const key = JSON.stringify(keys);
        const full = JSON.stringify(rowValues(ws, row, range));

        if (!seen.has(key)) seen.set(key, []);

        const previous = seen.get(key);

        if (previous.length) {
          const identical = previous.find(p => p.full === full);

          const original = mode === "key" && identical
            ? identical.row
            : previous[0].row;

          matches.push({
            original,
            row,
            type: mode === "key"
              ? (identical ? "Identical repeated key" : "Conflicting key")
              : "Matching selected columns",
            score: 100,
            keys: keys.join(" | "),
            decision: "both"
          });
        }

        previous.push({ row, full });

        if (matches.length > MAX_PAIRS) {
          incomplete = true;
          break;
        }
      }
    } else {
      const names = rows.map(row => ({
        row,
        name: cols.map(c =>
          String(cellAt(ws, row, c)?.v ?? "").trim()
        ).filter(Boolean).join(" ")
      })).filter(x => cleanName(x.name));

      const threshold = Number($("similarityThreshold").value);
      let comparisons = 0;

      outer:
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          if (comparisons >= MAX_COMPARISONS) {
            incomplete = true;
            break outer;
          }

          comparisons++;

          const a = names[i];
          const b = names[j];
          const score = nameSimilarity(a.name, b.name);

          if (score < threshold) continue;

          matches.push({
            original: a.row,
            row: b.row,
            type: score === 100
              ? "Exact name match"
              : "Possible name match",
            score,
            keys: a.name + " vs " + b.name,
            decision: "both"
          });

          if (matches.length > MAX_PAIRS) {
            incomplete = true;
            break outer;
          }
        }
      }
    }

    const formulas = Object.entries(ws).some(([address, cell]) =>
      !address.startsWith("!") &&
      cell?.f != null &&
      XLSX.utils.decode_cell(address).r >= header
    );

    analysis = {
      ws, range, header, rows,
      matches: matches.slice(0, MAX_PAIRS),
      mode, formulas, incomplete
    };

    $("totalRows").textContent = rows.length;
    $("duplicateCount").textContent = analysis.matches.length;
    $("results").replaceChildren();

    for (const match of analysis.matches) {
      addTableRow([
        match.row + 1,
        match.original + 1,
        match.keys,
        match.type + " — Review required"
      ]);
    }

    if (!analysis.matches.length) {
      addTableRow(["—", "—", "—", "No matches found"]);
    }

    $("resultCount").textContent =
      analysis.matches.length + " pairs for review" +
      (incomplete ? " — scan limit reached" : "");

    renderReview();
  }

  function recordCard(row, compareRow) {
    const card = document.createElement("div");
    card.className = "review-record";

    const title = document.createElement("h4");
    title.textContent = "Excel Row " + (row + 1);
    card.appendChild(title);

    for (let c = analysis.range.s.c; c <= analysis.range.e.c; c++) {
      const label = String(
        cellAt(analysis.ws, analysis.header, c)?.v ??
        "Column " + XLSX.utils.encode_col(c)
      );

      const value = cellAt(analysis.ws, row, c);
      const compare = cellAt(analysis.ws, compareRow, c);

      const line = document.createElement("div");
      line.className = "review-field";

      if (normalize(value) !== normalize(compare)) {
        line.classList.add("review-different");
      }

      const name = document.createElement("strong");
      name.textContent = label;

      const text = document.createElement("span");
      text.textContent = String(value?.w ?? value?.v ?? "(blank)");

      line.append(name, text);
      card.appendChild(line);
    }

    return card;
  }

  function renderReview() {
    $("reviewItems").replaceChildren();

    if (!analysis) return;

    analysis.matches.forEach((match, index) => {
      const item = document.createElement("div");
      item.className = "review-item";

      const title = document.createElement("div");
      title.className = "review-title";
      title.textContent =
        match.type + " — Rows " +
        (match.original + 1) + " and " + (match.row + 1) +
        " (" + match.score + "%)";

      const comparison = document.createElement("div");
      comparison.className = "review-comparison";

      comparison.append(
        recordCard(match.original, match.row),
        recordCard(match.row, match.original)
      );

      const wrapper = document.createElement("div");
      wrapper.className = "review-decision";

      const label = document.createElement("label");
      label.textContent = "Removal Decision";

      const select = document.createElement("select");
      select.setAttribute("aria-label", "Decision for pair " + (index + 1));

      const decisions = [
        ["both", "Keep Both — No Removal"],
        ["first", "Keep Row " + (match.original + 1) +
          " — Remove Row " + (match.row + 1)],
        ["second", "Keep Row " + (match.row + 1) +
          " — Remove Row " + (match.original + 1)]
      ];

      decisions.forEach(([value, text]) => {
        select.appendChild(new Option(text, value));
      });

      select.value = match.decision;

      select.addEventListener("change", () => {
        match.decision = select.value;
        updateSummary();
      });

      wrapper.append(label, select);
      item.append(title, comparison, wrapper);
      $("reviewItems").appendChild(item);
    });

    updateSummary();
  }

  function getDecisionState() {
    const removed = new Set();
    const retained = new Set();

    for (const m of analysis.matches) {
      if (m.decision === "first") {
        removed.add(m.row);
        retained.add(m.original);
      } else if (m.decision === "second") {
        removed.add(m.original);
        retained.add(m.row);
      } else {
        retained.add(m.original);
        retained.add(m.row);
      }
    }

    const contradictions = [...removed].filter(r => retained.has(r));

    return {
      removed,
      contradictions,
      remaining: analysis.rows.length - removed.size
    };
  }

  function updateSummary() {
    if (!analysis) return;

    const state = getDecisionState();

    const blocked =
      analysis.formulas ||
      analysis.incomplete ||
      state.contradictions.length > 0 ||
      state.removed.size === 0;

    $("exportBtn").disabled = blocked;
    $("uniqueCount").textContent = state.remaining;

    let message =
      "Records scanned: " + analysis.rows.length +
      " | Approved removals: " + state.removed.size +
      " | Records to keep: " + state.remaining;

    if (analysis.formulas) {
      message +=
        "\nExport blocked: formulas detected in selected worksheet.";
    }

    if (analysis.incomplete) {
      message +=
        "\nExport blocked: scanning limit reached. Narrow the selection.";
    }

    if (state.contradictions.length) {
      message +=
        "\nConflicting decisions: rows " +
        state.contradictions.map(r => r + 1).join(", ") +
        ". A row cannot be both retained and removed.";
    }

    if (!blocked) {
      message += "\nReady to export after final confirmation.";
    }

    $("reviewSummary").textContent = message;
    $("reviewSummary").style.whiteSpace = "pre-line";
    $("status").textContent = blocked
      ? "Review decisions or resolve export restrictions."
      : "Approved decisions ready. Export is available.";
  }

  function exportCleaned() {
    if (!analysis || $("exportBtn").disabled) return;

    const state = getDecisionState();

    if (!state.removed.size ||
        state.contradictions.length ||
        analysis.incomplete ||
        analysis.formulas) return;

    if (!confirm(
      "Export a new Excel file?\n\n" +
      "Remove: " + state.removed.size + " rows\n" +
      "Keep: " + state.remaining + " records\n\n" +
      "An audit sheet will list the review decisions.\n" +
      "Original file remains unchanged."
    )) return;

    try {
      const output = XLSX.utils.book_new();
      const grid = [];

      const header = [];

      for (let c = analysis.range.s.c; c <= analysis.range.e.c; c++) {
        header.push(
          cellAt(analysis.ws, analysis.header, c)?.v ?? ""
        );
      }

      grid.push(header);

      for (const row of analysis.rows) {
        if (state.removed.has(row)) continue;

        const values = [];

        for (let c = analysis.range.s.c; c <= analysis.range.e.c; c++) {
          const cell = cellAt(analysis.ws, row, c);
          values.push(cell?.v ?? null);
        }

        grid.push(values);
      }

      const sheet = XLSX.utils.aoa_to_sheet(grid);
      XLSX.utils.book_append_sheet(output, sheet, "Cleaned Data");

      const audit = [[
        "Worksheet",
        "Original Excel Row",
        "Matching Excel Row",
        "Classification",
        "Similarity",
        "Decision",
        "Removed Excel Row"
      ]];

      for (const match of analysis.matches) {
        const removedRow = match.decision === "first"
          ? match.row + 1
          : match.decision === "second"
            ? match.original + 1
            : "";

        audit.push([
          $("sheetSelect").value,
          match.original + 1,
          match.row + 1,
          match.type,
          match.score,
          match.decision === "both"
            ? "Keep both"
            : match.decision === "first"
              ? "Keep first"
              : "Keep second",
          removedRow
        ]);
      }

      XLSX.utils.book_append_sheet(
        output,
        XLSX.utils.aoa_to_sheet(audit),
        "Duplicate Audit"
      );

      const base = filename.replace(/\.(xlsx|xls)$/i, "");

      XLSX.writeFile(
        output,
        base + "_NeuraSheet_Reviewed_Duplicates.xlsx",
        { bookType: "xlsx", compression: true }
      );

      $("status").textContent =
        "Export completed. Verify the downloaded workbook.";
    } catch (error) {
      $("status").textContent = "Export failed: " + error.message;
    }
  }

  $("fileInput").addEventListener("change", loadFile);
  $("sheetSelect").addEventListener("change", loadColumns);
  $("headerRow").addEventListener("change", loadColumns);
  $("keyColumns").addEventListener("change", reset);
  $("normalizeText").addEventListener("change", reset);
  $("skipEmpty").addEventListener("change", reset);

  $("duplicateMode").addEventListener("change", () => {
    reset();
    setMode();
  });

  $("similarityThreshold").addEventListener("input", () => {
    $("thresholdValue").textContent =
      $("similarityThreshold").value + "%";
    reset();
  });

  $("analyzeBtn").addEventListener("click", findDuplicates);
  $("exportBtn").addEventListener("click", exportCleaned);

  setMode();
  console.log("Neura-Sheet Duplicate Detector v1.3 loaded");
})();

