"use strict";

/*
 Neura-Sheet Fintech UI
 Read-only result inspection drawer.
 Does not modify spreadsheet values or checker logic.
*/

(() => {
  function init() {
    document.body.classList.add("ns-fintech");

    const overlay = document.createElement("div");
    overlay.className = "ft-drawer-overlay";
    overlay.hidden = true;

    const drawer = document.createElement("aside");
    drawer.className = "ft-drawer";
    drawer.hidden = true;
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "ft-drawer-title");
    drawer.setAttribute("aria-hidden", "true");

    const head = document.createElement("div");
    head.className = "ft-drawer-head";

    const headingGroup = document.createElement("div");

    const kicker = document.createElement("p");
    kicker.className = "ft-drawer-kicker";
    kicker.textContent = "NEURA-SHEET / INSPECT";

    const title = document.createElement("h2");
    title.id = "ft-drawer-title";
    title.textContent = "Record Details";

    headingGroup.append(kicker, title);

    const closeButton = document.createElement("button");
    closeButton.className = "ft-drawer-close";
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close details");

    head.append(headingGroup, closeButton);

    const body = document.createElement("div");
    body.className = "ft-drawer-body";

    const foot = document.createElement("div");
    foot.className = "ft-drawer-foot";
    foot.textContent =
      "Read-only inspection. Edit values using the tool's correction fields.";

    drawer.append(head, body, foot);

    document.body.append(overlay, drawer);

    let previouslyFocused = null;
    let selectedRow = null;

    function close() {
      document.body.classList.remove("ft-drawer-open");
      drawer.setAttribute("aria-hidden", "true");
      drawer.hidden = true;
      overlay.hidden = true;

      if (selectedRow) {
        selectedRow.removeAttribute("data-ns-selected");
        selectedRow = null;
      }

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    }

    function addDetail(label, value) {
      const section = document.createElement("div");
      section.className = "ft-detail";

      const name = document.createElement("span");
      name.className = "ft-detail-label";
      name.textContent = label;

      const content = document.createElement("div");
      content.className = "ft-detail-value";
      content.textContent = value || "—";

      section.append(name, content);
      body.appendChild(section);
    }

    function openForRow(row) {
      const table = row.closest("table");
      if (!table) return;

      const headings = [...table.querySelectorAll("thead th")]
        .map(th => th.textContent.trim());

      const cells = [...row.cells];

      if (!cells.length) return;

      // Ignore placeholder and empty-state rows.
      if (cells.length === 1 && cells[0].colSpan > 1) {
        return;
      }

      body.replaceChildren();

      cells.forEach((cell, index) => {
        const label = headings[index] || "Column " + (index + 1);

        const input = cell.querySelector(
          "input, select, textarea"
        );

        let value = cell.textContent.trim();

        if (input) {
          value = input.type === "checkbox"
            ? (input.checked ? "Checked" : "Unchecked")
            : input.value;
        }

        addDetail(label, value);
      });

      if (selectedRow) {
        selectedRow.removeAttribute("data-ns-selected");
      }

      selectedRow = row;
      row.setAttribute("data-ns-selected", "true");

      previouslyFocused = document.activeElement;

      overlay.hidden = false;
      drawer.hidden = false;
      drawer.setAttribute("aria-hidden", "false");
      document.body.classList.add("ft-drawer-open");

      closeButton.focus();
    }

    // Event delegation handles dynamically loaded results.
    document.addEventListener("click", event => {
      if (event.target.closest(".ft-drawer")) return;

      const row = event.target.closest("tbody tr");

      if (!row) return;

      // Preserve all correction fields and buttons.
      if (event.target.closest(
        "input, button, select, textarea, a, label"
      )) {
        return;
      }

      if (row.closest(".sidebar")) return;

      openForRow(row);
    });

    // Keyboard-accessible row inspection.
    document.addEventListener("focusin", event => {
      const row = event.target.closest?.("tbody tr");
      if (!row) return;

      if (row.cells.length > 1) {
        row.dataset.nsInspectable = "true";
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" &&
          document.body.classList.contains("ft-drawer-open")) {
        close();
        return;
      }

      if (!document.body.classList.contains("ft-drawer-open")) {
        return;
      }

      // Keep Tab navigation inside the open modal.
      if (event.key === "Tab") {
        event.preventDefault();
        closeButton.focus();
      }
    });

    closeButton.addEventListener("click", close);
    overlay.addEventListener("click", close);

    // Mark available rows for inspection.
    const markRows = () => {
      document.querySelectorAll("main tbody tr, .main tbody tr")
        .forEach(row => {
          if (row.cells.length > 1) {
            row.dataset.nsInspectable = "true";
            if (!row.hasAttribute("tabindex")) {
              row.tabIndex = 0;
            }
          }
        });
    };

    markRows();

    const main = document.querySelector("main, .main");

    if (main) {
      const observer = new MutationObserver(markRows);
      observer.observe(main, {
        childList: true,
        subtree: true
      });

      main.addEventListener("keydown", event => {
        if (event.target.matches("tbody tr") &&
            (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openForRow(event.target);
        }
      });
    }

    console.log("Neura-Sheet Fintech UI v3.0 loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
