"use strict";

(() => {
  function init() {
    const button = document.getElementById("neura-menu-button");
    const sidebar = document.getElementById("neura-sidebar");

    if (!button || !sidebar) return;

    let backdrop = document.querySelector(".ns-backdrop");

    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "ns-backdrop";
      document.body.appendChild(backdrop);
    }

    function closeMenu() {
      document.body.classList.remove("ns-nav-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open navigation");
    }

    button.addEventListener("click", () => {
      const opened = document.body.classList.toggle("ns-nav-open");

      button.setAttribute("aria-expanded", String(opened));
      button.setAttribute(
        "aria-label",
        opened ? "Close navigation" : "Open navigation"
      );
    });

    backdrop.addEventListener("click", closeMenu);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMenu();
    });

    sidebar.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", closeMenu);
    });

    const media = window.matchMedia("(min-width: 951px)");

    if (media.addEventListener) {
      media.addEventListener("change", event => {
        if (event.matches) closeMenu();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
