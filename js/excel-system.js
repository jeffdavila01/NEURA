/* =========================================================
   NEURA UNIVERSAL EXCEL ENGINE
   FILE: js/excel-system.js
========================================================= */

(() => {
    "use strict";

    const EXCELJS_URL =
        "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";

    const modules = [];

    const localDate = () => {
        const d = new Date();

        return new Date(
            d.getTime() -
            d.getTimezoneOffset() * 60000
        )
            .toISOString()
            .split("T")[0];
    };


    const normalize = value =>
        String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                "_"
            )
            .replace(
                /^_+|_+$/g,
                ""
            );


    const cellText = cell => {

        if (!cell) {
            return "";
        }


        if (
            cell.value instanceof Date
        ) {

            const d =
                cell.value;

            const y =
                d.getFullYear();

            const m =
                String(
                    d.getMonth() + 1
                )
                    .padStart(
                        2,
                        "0"
                    );

            const day =
                String(
                    d.getDate()
                )
                    .padStart(
                        2,
                        "0"
                    );


            return `${y}-${m}-${day}`;

        }


        return String(
            cell.text ??
            cell.value ??
            ""
        ).trim();

    };


    async function fetchJSON(
        url,
        options = {}
    ) {

        const response =
            await fetch(
                url,
                options
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(

                data.message ||

                `Request failed: ${response.status}`

            );

        }


        return data;

    }


    /* =====================================================
       LOAD EXCELJS
    ===================================================== */

    function loadExcelJS() {

        if (
            window.ExcelJS
        ) {

            return Promise.resolve(
                window.ExcelJS
            );

        }


        return new Promise(
            (
                resolve,
                reject
            ) => {

                let script =
                    document.querySelector(
                        "script[data-neura-exceljs]"
                    );


                if (!script) {

                    script =
                        document.createElement(
                            "script"
                        );


                    script.src =
                        EXCELJS_URL;


                    script.async =
                        true;


                    script.dataset.neuraExceljs =
                        "1";


                    document.head
                        .appendChild(
                            script
                        );

                }


                script.addEventListener(
                    "load",
                    () => {

                        resolve(
                            window.ExcelJS
                        );

                    },
                    {
                        once: true
                    }
                );


                script.addEventListener(
                    "error",
                    () => {

                        reject(
                            new Error(
                                "Unable to load Excel library. Check your internet connection."
                            )
                        );

                    },
                    {
                        once: true
                    }
                );

            }
        );

    }


    /* =====================================================
       DOWNLOAD
    ===================================================== */

    function download(
        buffer,
        filename
    ) {

        const blob =
            new Blob(
                [
                    buffer
                ],
                {
                    type:
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const a =
            document.createElement(
                "a"
            );


        a.href =
            url;


        a.download =
            filename;


        document.body
            .appendChild(
                a
            );


        a.click();


        a.remove();


        setTimeout(
            () => {

                URL.revokeObjectURL(
                    url
                );

            },
            1000
        );

    }


    /* =====================================================
       EXCEL DESIGN + AUTO WIDTH
    ===================================================== */

    function styleSheet(
        ws,
        columns
    ) {

        /* Freeze header */

        ws.views = [
            {
                state:
                    "frozen",

                ySplit:
                    1
            }
        ];


        /* Excel filter */

        ws.autoFilter = {

            from: {
                row:
                    1,

                column:
                    1
            },

            to: {
                row:
                    1,

                column:
                    columns.length
            }

        };


        /* Header */

        const header =
            ws.getRow(1);


        header.height =
            24;


        header.eachCell(
            cell => {

                cell.font = {

                    bold:
                        true,

                    color: {
                        argb:
                            "FFFFFFFF"
                    }

                };


                cell.fill = {

                    type:
                        "pattern",

                    pattern:
                        "solid",

                    fgColor: {
                        argb:
                            "FF3263E8"
                    }

                };


                cell.alignment = {

                    vertical:
                        "middle",

                    horizontal:
                        "center",

                    wrapText:
                        true

                };

            }
        );


        /* Wrap data */

        ws.eachRow(
            (
                row,
                rowNo
            ) => {

                if (
                    rowNo ===
                    1
                ) {

                    return;

                }


                row.eachCell(
                    {
                        includeEmpty:
                            true
                    },
                    cell => {

                        cell.alignment = {

                            vertical:
                                "top",

                            wrapText:
                                true

                        };

                    }
                );

            }
        );


        /* Automatic column width */

        columns.forEach(
            (
                config,
                index
            ) => {

                const col =
                    ws.getColumn(
                        index + 1
                    );


                let longest =
                    String(
                        config.header ||
                        ""
                    ).length;


                col.eachCell(
                    {
                        includeEmpty:
                            true
                    },
                    cell => {

                        longest =
                            Math.max(

                                longest,

                                cellText(
                                    cell
                                ).length

                            );

                    }
                );


                col.width =
                    Math.min(

                        Math.max(

                            longest + 2,

                            config.minWidth ||
                            12

                        ),

                        config.maxWidth ||
                        40

                    );


                if (
                    config.numFmt
                ) {

                    col.numFmt =
                        config.numFmt;

                }

            }
        );

    }


    /* =====================================================
       CREATE WORKBOOK
    ===================================================== */

    async function makeWorkbook(
        config,
        rows = [],
        template = false
    ) {

        const ExcelJS =
            await loadExcelJS();


        const wb =
            new ExcelJS.Workbook();


        wb.creator =
            "NEURA";


        const ws =
            wb.addWorksheet(
                config.sheetName
            );


        ws.columns =
            config.columns.map(
                column => ({

                    header:
                        column.header,

                    key:
                        column.key,

                    width:
                        column.minWidth ||
                        12

                })
            );


        rows.forEach(
            row => {

                ws.addRow(
                    row
                );

            }
        );


        styleSheet(
            ws,
            config.columns
        );


        if (
            template &&
            config.configureTemplate
        ) {

            config.configureTemplate(
                ws
            );

        }


        return wb;

    }


    /* =====================================================
       READ IMPORT FILE
    ===================================================== */

    async function readRows(
        file,
        config
    ) {

        const ExcelJS =
            await loadExcelJS();


        const wb =
            new ExcelJS.Workbook();


        await wb.xlsx.load(
            await file.arrayBuffer()
        );


        const ws =
            wb.worksheets[0];


        if (!ws) {

            throw new Error(
                "Excel file has no worksheet."
            );

        }


        const headers =
            new Map();


        ws.getRow(1)
            .eachCell(
                (
                    cell,
                    number
                ) => {

                    headers.set(

                        normalize(
                            cellText(
                                cell
                            )
                        ),

                        number

                    );

                }
            );


        const positions =
            {};


        for (
            const col
            of config.columns
        ) {

            const choices = [

                col.header,

                col.key,

                ...(
                    col.aliases ||
                    []
                )

            ].map(
                normalize
            );


            const found =
                choices.find(
                    choice =>
                        headers.has(
                            choice
                        )
                );


            if (
                !found &&
                col.required !==
                false
            ) {

                throw new Error(
                    `Missing Excel column: ${col.header}`
                );

            }


            positions[
                col.key
            ] =
                found
                    ? headers.get(
                        found
                    )
                    : null;

        }


        const rows =
            [];


        ws.eachRow(
            (
                row,
                rowNo
            ) => {

                if (
                    rowNo ===
                    1
                ) {

                    return;

                }


                const record =
                    {};


                let hasValue =
                    false;


                config.columns
                    .forEach(
                        col => {

                            const pos =
                                positions[
                                    col.key
                                ];


                            const value =
                                pos

                                    ? cellText(
                                        row.getCell(
                                            pos
                                        )
                                    )

                                    : "";


                            record[
                                col.key
                            ] =
                                value;


                            if (
                                value !==
                                ""
                            ) {

                                hasValue =
                                    true;

                            }

                        }
                    );


                if (
                    hasValue
                ) {

                    rows.push(
                        record
                    );

                }

            }
        );


        return rows;

    }


    /* =====================================================
       REMOVE OLD BUTTON LISTENERS
    ===================================================== */

    function clearOldListeners(
        button
    ) {

        if (!button) {

            return null;

        }


        const clone =
            button.cloneNode(
                true
            );


        button.replaceWith(
            clone
        );


        return clone;

    }


    function findButton(
        toolbar,
        selectors,
        text
    ) {

        for (
            const selector
            of selectors ||
            []
        ) {

            const button =
                document.querySelector(
                    selector
                );


            if (
                button
            ) {

                return clearOldListeners(
                    button
                );

            }

        }


        const existing =
            Array.from(
                toolbar.querySelectorAll(
                    "button"
                )
            )
                .find(
                    button =>
                        text.test(
                            button.textContent ||
                            ""
                        )
                );


        return clearOldListeners(
            existing
        );

    }


    function ensureButton(
        toolbar,
        group,
        button,
        id,
        label
    ) {

        if (!button) {

            button =
                document.createElement(
                    "button"
                );


            button.className =
                "secondary-btn";

        }


        button.id =
            id;


        button.type =
            "button";


        button.textContent =
            label;


        if (
            !group.contains(
                button
            )
        ) {

            group.appendChild(
                button
            );

        }


        return button;

    }


    /* =====================================================
       MOUNT EXCEL TO MODULE
    ===================================================== */

    function mount(
        config
    ) {

        if (
            !document.querySelector(
                config.pageSelector
            )
        ) {

            return;

        }


        const toolbar =
            config.toolbarSelectors
                .map(
                    selector =>
                        document.querySelector(
                            selector
                        )
                )
                .find(
                    Boolean
                );


        if (
            !toolbar
        ) {

            return;

        }


        if (
            toolbar.dataset
                .neuraExcelMounted ===
            config.key
        ) {

            return;

        }


        toolbar.dataset
            .neuraExcelMounted =
            config.key;


        let group =
            toolbar.querySelector(
                `[data-neura-excel="${config.key}"]`
            );


        if (!group) {

            group =
                document.createElement(
                    "div"
                );


            group.dataset
                .neuraExcel =
                config.key;


            group.style.display =
                "flex";


            group.style.gap =
                "10px";


            group.style.flexWrap =
                "wrap";


            toolbar.appendChild(
                group
            );

        }


        const importBtn =
            ensureButton(

                toolbar,

                group,

                findButton(
                    toolbar,
                    config.importSelectors,
                    /import/i
                ),

                `${config.key}ImportExcelBtn`,

                "Import Excel"

            );


        const exportBtn =
            ensureButton(

                toolbar,

                group,

                findButton(
                    toolbar,
                    config.exportSelectors,
                    /export/i
                ),

                `${config.key}ExportExcelBtn`,

                "Export Excel"

            );


        const templateBtn =
            ensureButton(

                toolbar,

                group,

                findButton(
                    toolbar,
                    config.templateSelectors,
                    /template/i
                ),

                `${config.key}TemplateExcelBtn`,

                "Download Template"

            );


        let input =
            document.querySelector(
                `#${config.key}ExcelInput`
            );


        if (!input) {

            input =
                document.createElement(
                    "input"
                );


            input.type =
                "file";


            input.accept =
                ".xlsx";


            input.hidden =
                true;


            input.id =
                `${config.key}ExcelInput`;


            document.body
                .appendChild(
                    input
                );

        }


        /* =================================================
           EXPORT
        ================================================= */

        exportBtn.addEventListener(
            "click",
            async () => {

                const old =
                    exportBtn.textContent;


                try {

                    exportBtn.disabled =
                        true;


                    exportBtn.textContent =
                        "Exporting...";


                    const rows =
                        await config
                            .getExportRows();


                    if (
                        !rows.length
                    ) {

                        alert(
                            `No ${config.label} records to export.`
                        );


                        return;

                    }


                    const wb =
                        await makeWorkbook(
                            config,
                            rows,
                            false
                        );


                    download(

                        await wb.xlsx
                            .writeBuffer(),

                        `${config.fileName}_${localDate()}.xlsx`

                    );


                } catch (
                    error
                ) {

                    console.error(
                        error
                    );


                    alert(
                        error.message
                    );


                } finally {

                    exportBtn.disabled =
                        false;


                    exportBtn.textContent =
                        old;

                }

            }
        );


        /* =================================================
           DOWNLOAD TEMPLATE
        ================================================= */

        templateBtn.addEventListener(
            "click",
            async () => {

                const old =
                    templateBtn.textContent;


                try {

                    templateBtn.disabled =
                        true;


                    templateBtn.textContent =
                        "Creating...";


                    const wb =
                        await makeWorkbook(
                            config,
                            [],
                            true
                        );


                    download(

                        await wb.xlsx
                            .writeBuffer(),

                        `${config.fileName}_Template.xlsx`

                    );


                } catch (
                    error
                ) {

                    console.error(
                        error
                    );


                    alert(
                        error.message
                    );


                } finally {

                    templateBtn.disabled =
                        false;


                    templateBtn.textContent =
                        old;

                }

            }
        );


        /* =================================================
           IMPORT
        ================================================= */

        importBtn.addEventListener(
            "click",
            () => {

                input.click();

            }
        );


        input.addEventListener(
            "change",
            async () => {

                const file =
                    input.files?.[0];


                if (!file) {

                    return;

                }


                const old =
                    importBtn.textContent;


                try {

                    importBtn.disabled =
                        true;


                    importBtn.textContent =
                        "Importing...";


                    const rows =
                        await readRows(
                            file,
                            config
                        );


                    if (
                        !rows.length
                    ) {

                        throw new Error(
                            "No data rows found in Excel file."
                        );

                    }


                    if (
                        !confirm(
                            `Import ${rows.length} row(s) into ${config.label}?`
                        )
                    ) {

                        return;

                    }


                    const result =
                        await config
                            .importRows(
                                rows
                            );


                    alert(

                        result.message ||

                        `${config.label} import finished.`

                    );


                    if (
                        config
                            .reloadAfterImport !==
                        false
                    ) {

                        location.reload();

                    }


                } catch (
                    error
                ) {

                    console.error(
                        error
                    );


                    alert(
                        error.message
                    );


                } finally {

                    input.value =
                        "";


                    importBtn.disabled =
                        false;


                    importBtn.textContent =
                        old;

                }

            }
        );

    }


    /* =====================================================
       BOOT
    ===================================================== */

    function boot() {

        modules.forEach(
            mount
        );

    }


    window.NEURAExcel = {

        register(
            config
        ) {

            modules.push(
                config
            );


            if (
                document.readyState !==
                "loading"
            ) {

                mount(
                    config
                );

            }

        },


        fetchJSON,

        boot,

        normalize,

        localDate

    };


    document.addEventListener(
        "DOMContentLoaded",
        boot
    );

})();