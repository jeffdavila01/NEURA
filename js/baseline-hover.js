/* =========================================================
   NEURA
   STUDIO BASELINE-INSPIRED HOVER LIGHT

   FILE:
   js/baseline-hover.js
========================================================= */

(() => {
    "use strict";


    const HOVER_SELECTORS = [

        ".panel",

        ".stat-card",

        ".coa-toolbar",

        ".purchase-toolbar",

        ".supplier-toolbar-panel",

        ".action-card",

        ".purchase-summary > div",

        ".primary-btn",

        ".secondary-btn",

        ".theme-toggle-btn",

        ".admin-profile",

        ".nav-link"

    ];


    /* =====================================================
       APPLY LIGHT CLASS
    ===================================================== */

    function applyHoverClasses(
        root = document
    ) {

        HOVER_SELECTORS
            .forEach(
                selector => {

                    root
                        .querySelectorAll(
                            selector
                        )
                        .forEach(
                            element => {

                                element
                                    .classList
                                    .add(
                                        "baseline-hover-light"
                                    );

                            }
                        );

                }
            );


        /* TABLE ROWS */

        root
            .querySelectorAll(
                "tbody tr"
            )
            .forEach(
                row => {

                    row
                        .classList
                        .add(
                            "baseline-row-hover"
                        );

                }
            );

    }


    /* =====================================================
       TRACK MOUSE
    ===================================================== */

    function handleMouseMove(
        event
    ) {

        const target =
            event.target.closest(
                ".baseline-hover-light, .baseline-row-hover"
            );


        if (!target) {

            return;

        }


        if (
            !document.body
                .classList
                .contains(
                    "night-mode"
                )
        ) {

            return;

        }


        const rect =
            target
                .getBoundingClientRect();


        const x =
            event.clientX -
            rect.left;


        const y =
            event.clientY -
            rect.top;


        target.style
            .setProperty(
                "--mouse-x",
                `${x}px`
            );


        target.style
            .setProperty(
                "--mouse-y",
                `${y}px`
            );

    }


    /* =====================================================
       WATCH DYNAMIC CONTENT
    ===================================================== */

    function observeDynamicElements() {

        const observer =
            new MutationObserver(
                mutations => {

                    mutations
                        .forEach(
                            mutation => {

                                mutation
                                    .addedNodes
                                    .forEach(
                                        node => {

                                            if (
                                                node.nodeType !==
                                                1
                                            ) {

                                                return;

                                            }


                                            if (
                                                node.matches?.(
                                                    HOVER_SELECTORS.join(
                                                        ","
                                                    )
                                                )
                                            ) {

                                                node
                                                    .classList
                                                    .add(
                                                        "baseline-hover-light"
                                                    );

                                            }


                                            if (
                                                node.matches?.(
                                                    "tbody tr"
                                                )
                                            ) {

                                                node
                                                    .classList
                                                    .add(
                                                        "baseline-row-hover"
                                                    );

                                            }


                                            applyHoverClasses(
                                                node
                                            );

                                        }
                                    );

                            }
                        );

                }
            );


        observer.observe(
            document.body,
            {

                childList:
                    true,

                subtree:
                    true

            }
        );

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function init() {

        applyHoverClasses();


        document.addEventListener(
            "mousemove",
            handleMouseMove,
            {
                passive:
                    true
            }
        );


        observeDynamicElements();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );


    } else {

        init();

    }

})();