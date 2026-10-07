/* =========================================================
   NEURA ACCOUNTING SYSTEM
   FILE: js/app.js
   ACTION: REPLACE ENTIRE FILE
========================================================= */


document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initChartOfAccounts();
    initPurchaseJournal();
    initSalesJournal();
    initSuppliers();
});


/* =========================================================
   SHARED HELPERS
========================================================= */

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatPeso(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP"
    }).format(Number(value) || 0);
}


function getLocalDateString() {
    const now = new Date();

    return new Date(
        now.getTime() -
        now.getTimezoneOffset() * 60000
    )
        .toISOString()
        .split("T")[0];
}


async function fetchJSON(url, options = {}) {

    const response =
        await fetch(url, options);

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    if (
        !contentType.includes(
            "application/json"
        )
    ) {

        const text =
            await response.text();

        throw new Error(
            `Expected JSON from ${url}, but received ${text.slice(0, 40) ||
            "non-JSON response"
            }.`
        );
    }

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

/* =========================================================
   NEURA REUSABLE EXCEL SYSTEM
   PLACE BEFORE: function initChartOfAccounts()
========================================================= */

const NEURA_EXCELJS_URL =
    "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";


function normalizeExcelHeader(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

}


function excelCellText(cell) {

    if (!cell) {
        return "";
    }

    return String(
        cell.text ??
        cell.value ??
        ""
    ).trim();

}


function findButtonByText(
    container,
    pattern
) {

    if (!container) {
        return null;
    }

    return Array.from(
        container.querySelectorAll("button")
    ).find(
        button =>
            pattern.test(
                button.textContent || ""
            )
    ) || null;

}


function loadScriptOnce(
    src,
    globalName
) {

    if (
        globalName &&
        window[globalName]
    ) {

        return Promise.resolve(
            window[globalName]
        );

    }


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const existing =
                document.querySelector(
                    `script[data-neura-src="${src}"]`
                );


            if (existing) {

                existing.addEventListener(
                    "load",
                    () => {

                        resolve(
                            window[globalName]
                        );

                    },
                    {
                        once: true
                    }
                );


                existing.addEventListener(
                    "error",
                    () => {

                        reject(
                            new Error(
                                "Unable to load Excel library."
                            )
                        );

                    },
                    {
                        once: true
                    }
                );


                return;

            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                src;

            script.async =
                true;

            script.dataset.neuraSrc =
                src;


            script.addEventListener(
                "load",
                () => {

                    if (
                        !window[
                        globalName
                        ]
                    ) {

                        reject(
                            new Error(
                                "Excel library loaded but did not initialize."
                            )
                        );

                        return;

                    }


                    resolve(
                        window[
                        globalName
                        ]
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


            document.head
                .appendChild(
                    script
                );

        }
    );

}


async function ensureExcelJS() {

    if (
        window.ExcelJS
    ) {

        return window.ExcelJS;

    }


    await loadScriptOnce(
        NEURA_EXCELJS_URL,
        "ExcelJS"
    );


    return window.ExcelJS;

}


function downloadBlob(
    blob,
    filename
) {

    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        filename;


    document.body
        .appendChild(
            link
        );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );

}


function applyExcelStyle(
    worksheet,
    columns,
    options = {}
) {

    const minWidth =
        options.minWidth ||
        12;


    const maxWidth =
        options.maxWidth ||
        40;


    /* =========================
       FREEZE HEADER
    ========================= */

    worksheet.views = [

        {
            state:
                "frozen",

            ySplit:
                1
        }

    ];


    /* =========================
       FILTER
    ========================= */

    worksheet.autoFilter = {

        from: {
            row: 1,
            column: 1
        },

        to: {
            row: 1,
            column:
                columns.length
        }

    };


    /* =========================
       HEADER STYLE
    ========================= */

    const headerRow =
        worksheet.getRow(1);


    headerRow.height =
        24;


    headerRow.eachCell(
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
                    "center"

            };


            cell.border = {

                top: {
                    style:
                        "thin",

                    color: {
                        argb:
                            "FFD7D9E2"
                    }
                },

                left: {
                    style:
                        "thin",

                    color: {
                        argb:
                            "FFD7D9E2"
                    }
                },

                bottom: {
                    style:
                        "thin",

                    color: {
                        argb:
                            "FFD7D9E2"
                    }
                },

                right: {
                    style:
                        "thin",

                    color: {
                        argb:
                            "FFD7D9E2"
                    }
                }

            };

        }
    );


    /* =========================
       DATA STYLE
    ========================= */

    worksheet.eachRow(
        (
            row,
            rowNumber
        ) => {

            if (
                rowNumber ===
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


                    cell.border = {

                        top: {
                            style:
                                "thin",

                            color: {
                                argb:
                                    "FFE5E7ED"
                            }
                        },

                        left: {
                            style:
                                "thin",

                            color: {
                                argb:
                                    "FFE5E7ED"
                            }
                        },

                        bottom: {
                            style:
                                "thin",

                            color: {
                                argb:
                                    "FFE5E7ED"
                            }
                        },

                        right: {
                            style:
                                "thin",

                            color: {
                                argb:
                                    "FFE5E7ED"
                            }
                        }

                    };

                }
            );

        }
    );


    /* =========================
       AUTO COLUMN WIDTH
    ========================= */

    columns.forEach(
        (
            columnConfig,
            index
        ) => {

            const excelColumn =
                worksheet.getColumn(
                    index + 1
                );


            let longest =
                String(
                    columnConfig.header ||
                    ""
                ).length;


            excelColumn.eachCell(
                {
                    includeEmpty:
                        true
                },
                cell => {

                    const value =
                        excelCellText(
                            cell
                        );


                    if (
                        value.length >
                        longest
                    ) {

                        longest =
                            value.length;

                    }

                }
            );


            const columnMin =
                columnConfig.minWidth ||
                minWidth;


            const columnMax =
                columnConfig.maxWidth ||
                maxWidth;


            excelColumn.width =
                Math.min(

                    Math.max(
                        longest + 2,
                        columnMin
                    ),

                    columnMax

                );

        }
    );

}


function setupExcelModule(
    config
) {

    const toolbar =

        document.querySelector(
            config.toolbarSelector
        ) ||

        document.querySelector(
            config.fallbackToolbarSelector
        );


    if (!toolbar) {

        return;

    }


    /* =====================================================
       FIND EXISTING BUTTONS
       OR CREATE THEM AUTOMATICALLY
    ===================================================== */

    let importButton =

        document.querySelector(
            `#${config.key}ImportExcelBtn`
        ) ||

        findButtonByText(
            toolbar,
            /import/i
        );


    let exportButton =

        document.querySelector(
            `#${config.key}ExportExcelBtn`
        ) ||

        findButtonByText(
            toolbar,
            /export/i
        );


    let templateButton =

        document.querySelector(
            `#${config.key}TemplateExcelBtn`
        ) ||

        findButtonByText(
            toolbar,
            /template/i
        );


    /* =========================
       IMPORT BUTTON
    ========================= */

    if (!importButton) {

        importButton =
            document.createElement(
                "button"
            );


        importButton.type =
            "button";


        importButton.className =
            "secondary-btn";


        importButton.textContent =
            "Import Excel";


        toolbar.appendChild(
            importButton
        );

    }


    /* =========================
       EXPORT BUTTON
    ========================= */

    if (!exportButton) {

        exportButton =
            document.createElement(
                "button"
            );


        exportButton.type =
            "button";


        exportButton.className =
            "secondary-btn";


        exportButton.textContent =
            "Export Excel";


        toolbar.appendChild(
            exportButton
        );

    }


    /* =========================
       TEMPLATE BUTTON
    ========================= */

    if (!templateButton) {

        templateButton =
            document.createElement(
                "button"
            );


        templateButton.type =
            "button";


        templateButton.className =
            "secondary-btn";


        templateButton.textContent =
            "Download Template";


        toolbar.appendChild(
            templateButton
        );

    }


    importButton.id =
        `${config.key}ImportExcelBtn`;


    exportButton.id =
        `${config.key}ExportExcelBtn`;


    templateButton.id =
        `${config.key}TemplateExcelBtn`;


    /* =====================================================
       HIDDEN FILE INPUT
    ===================================================== */

    let fileInput =
        document.querySelector(
            `#${config.key}ExcelFileInput`
        );


    if (!fileInput) {

        fileInput =
            document.createElement(
                "input"
            );


        fileInput.type =
            "file";


        fileInput.accept =
            ".xlsx";


        fileInput.id =
            `${config.key}ExcelFileInput`;


        fileInput.hidden =
            true;


        document.body
            .appendChild(
                fileInput
            );

    }


    /* =====================================================
       BUILD WORKBOOK
    ===================================================== */

    async function buildWorkbook(
        rows = []
    ) {

        const ExcelJS =
            await ensureExcelJS();


        const workbook =
            new ExcelJS.Workbook();


        workbook.creator =
            "NEURA";


        workbook.created =
            new Date();


        const worksheet =
            workbook.addWorksheet(
                config.sheetName
            );


        worksheet.columns =
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

                worksheet.addRow(
                    row
                );

            }
        );


        applyExcelStyle(
            worksheet,
            config.columns,
            {
                minWidth: 12,
                maxWidth: 40
            }
        );


        if (
            config.configureTemplate
        ) {

            config.configureTemplate(
                worksheet
            );

        }


        return {

            workbook,
            worksheet

        };

    }


    /* =====================================================
       EXPORT EXCEL
    ===================================================== */

    exportButton.addEventListener(
        "click",
        async () => {

            try {

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


                exportButton.disabled =
                    true;


                exportButton.textContent =
                    "Exporting...";


                const {
                    workbook
                } =
                    await buildWorkbook(
                        rows
                    );


                const buffer =
                    await workbook
                        .xlsx
                        .writeBuffer();


                downloadBlob(

                    new Blob(

                        [
                            buffer
                        ],

                        {
                            type:
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        }

                    ),

                    `${config.fileBaseName}_${getLocalDateString()}.xlsx`

                );


            } catch (error) {

                console.error(
                    `${config.label.toUpperCase()} EXPORT ERROR:`,
                    error
                );


                alert(
                    error.message
                );


            } finally {

                exportButton.disabled =
                    false;


                exportButton.textContent =
                    "Export Excel";

            }

        }
    );


    /* =====================================================
       DOWNLOAD TEMPLATE
    ===================================================== */

    templateButton.addEventListener(
        "click",
        async () => {

            try {

                templateButton.disabled =
                    true;


                templateButton.textContent =
                    "Creating...";


                const {
                    workbook
                } =
                    await buildWorkbook(
                        []
                    );


                const buffer =
                    await workbook
                        .xlsx
                        .writeBuffer();


                downloadBlob(

                    new Blob(

                        [
                            buffer
                        ],

                        {
                            type:
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        }

                    ),

                    `${config.fileBaseName}_Template.xlsx`

                );


            } catch (error) {

                console.error(
                    `${config.label.toUpperCase()} TEMPLATE ERROR:`,
                    error
                );


                alert(
                    error.message
                );


            } finally {

                templateButton.disabled =
                    false;


                templateButton.textContent =
                    "Download Template";

            }

        }
    );


    /* =====================================================
       OPEN IMPORT
    ===================================================== */

    importButton.addEventListener(
        "click",
        () => {

            fileInput.click();

        }
    );


    /* =====================================================
       IMPORT EXCEL
    ===================================================== */

    fileInput.addEventListener(
        "change",
        async event => {

            const file =
                event.target
                    .files?.[0];


            if (!file) {

                return;

            }


            try {

                importButton.disabled =
                    true;


                importButton.textContent =
                    "Importing...";


                const ExcelJS =
                    await ensureExcelJS();


                const workbook =
                    new ExcelJS.Workbook();


                await workbook
                    .xlsx
                    .load(
                        await file
                            .arrayBuffer()
                    );


                const worksheet =
                    workbook
                        .worksheets[0];


                if (!worksheet) {

                    throw new Error(
                        "The Excel file has no worksheet."
                    );

                }


                /* =========================
                   READ HEADERS
                ========================= */

                const headerRow =
                    worksheet.getRow(1);


                const headerMap =
                    new Map();


                headerRow.eachCell(
                    {
                        includeEmpty:
                            false
                    },
                    (
                        cell,
                        columnNumber
                    ) => {

                        headerMap.set(

                            normalizeExcelHeader(
                                excelCellText(
                                    cell
                                )
                            ),

                            columnNumber

                        );

                    }
                );


                const columnPositions =
                    {};


                /* =========================
                   MATCH REQUIRED COLUMNS
                ========================= */

                for (
                    const column
                    of config.columns
                ) {

                    const acceptedHeaders =
                        [

                            column.header,

                            column.key,

                            ...(
                                column.aliases ||
                                []
                            )

                        ].map(
                            normalizeExcelHeader
                        );


                    const matchedHeader =
                        acceptedHeaders.find(
                            header =>
                                headerMap.has(
                                    header
                                )
                        );


                    if (
                        !matchedHeader
                    ) {

                        throw new Error(
                            `Missing Excel column: ${column.header}`
                        );

                    }


                    columnPositions[
                        column.key
                    ] =
                        headerMap.get(
                            matchedHeader
                        );

                }


                /* =========================
                   READ DATA ROWS
                ========================= */

                const rows = [];


                worksheet.eachRow(
                    (
                        row,
                        rowNumber
                    ) => {

                        if (
                            rowNumber ===
                            1
                        ) {

                            return;

                        }


                        const record =
                            {};


                        let hasValue =
                            false;


                        for (
                            const column
                            of config.columns
                        ) {

                            const value =
                                excelCellText(

                                    row.getCell(
                                        columnPositions[
                                        column.key
                                        ]
                                    )

                                );


                            record[
                                column.key
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


                        if (
                            hasValue
                        ) {

                            rows.push(
                                record
                            );

                        }

                    }
                );


                if (
                    !rows.length
                ) {

                    throw new Error(
                        "No data rows were found in the Excel file."
                    );

                }


                const confirmed =
                    window.confirm(

                        `Import ${rows.length} row(s) into ${config.label}?`

                    );


                if (
                    !confirmed
                ) {

                    return;

                }


                const result =
                    await config
                        .importRows(
                            rows
                        );


                if (
                    config
                        .onImportComplete
                ) {

                    await config
                        .onImportComplete(
                            result
                        );

                }


                alert(

                    result?.message ||

                    `${config.label} import finished.`

                );


            } catch (error) {

                console.error(
                    `${config.label.toUpperCase()} IMPORT ERROR:`,
                    error
                );


                alert(
                    error.message
                );


            } finally {

                fileInput.value =
                    "";


                importButton.disabled =
                    false;


                importButton.textContent =
                    "Import Excel";

            }

        }
    );

}

/* =========================================================
   CHART OF ACCOUNTS
========================================================= */

function initChartOfAccounts() {

    const accountForm =
        document.querySelector(
            "#accountForm"
        );

    const accountType =
        document.querySelector(
            "#accountType"
        );

    const accountCode =
        document.querySelector(
            "#accountCode"
        );

    const accountName =
        document.querySelector(
            "#accountName"
        );

    const accountTableBody =
        document.querySelector(
            "#accountTableBody"
        );

    const accountSearch =
        document.querySelector(
            "#accountSearch"
        );

    const createAccountBtn =
        document.querySelector(
            "#createAccountBtn"
        );

    const accountFormPanel =
        document.querySelector(
            "#accountFormPanel"
        );

    const cancelAccountBtn =
        document.querySelector(
            "#cancelAccountBtn"
        );

    const accountCodeHint =
        document.querySelector(
            "#accountCodeHint"
        );


    if (
        !accountForm ||
        !accountType ||
        !accountCode ||
        !accountTableBody
    ) {
        return;
    }

    function showAccountForm() {

        if (!accountFormPanel) {
            return;
        }

        accountFormPanel.hidden = false;

        if (createAccountBtn) {
            createAccountBtn.textContent = "Close Form";
            createAccountBtn.setAttribute("aria-expanded", "true");
        }

        accountFormPanel.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        setTimeout(
            () => accountName?.focus(),
            250
        );

    }

    function hideAccountForm() {

        if (!accountFormPanel) {
            return;
        }

        accountFormPanel.hidden = true;

        if (createAccountBtn) {
            createAccountBtn.textContent = "+ Create";
            createAccountBtn.setAttribute("aria-expanded", "false");
        }

    }


    const accountPrefixes = {
        Assets: "01",
        Liabilities: "02",
        Equity: "03",
        Revenue: "04",
        Expenses: "05"
    };


    let accounts = [];


    if (accountCodeHint) {

        accountCodeHint.textContent = "";

        accountCodeHint.style.display =
            "none";

    }


    async function loadAccounts() {

        accountTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="3">
                    Loading accounts...
                </td>
            </tr>
        `;


        try {

            const data =
                await fetchJSON(
                    "/api/accounts",
                    {
                        cache:
                            "no-store"
                    }
                );


            accounts =
                data.accounts || [];


            renderAccounts(
                accounts
            );


        } catch (error) {

            console.error(
                "LOAD ACCOUNTS ERROR:",
                error
            );


            accountTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="3">
                        Unable to load accounts.
                    </td>
                </tr>
            `;

        }

    }


    function renderAccounts(
        accountList
    ) {

        if (!accountList.length) {

            accountTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="3">
                        No accounts found.
                    </td>
                </tr>
            `;

            return;

        }


        accountTableBody.innerHTML =
            accountList
                .map(
                    account => `
                        <tr>

                            <td>
                                ${escapeHTML(
                        account.account_code
                    )}
                            </td>

                            <td>
                                ${escapeHTML(
                        account.account_name
                    )}
                            </td>

                            <td>
                                ${escapeHTML(
                        account.account_type
                    )}
                            </td>

                        </tr>
                    `
                )
                .join("");

    }


    async function getNextAccountCode() {

        const selectedType =
            accountType.value;


        const prefix =
            accountPrefixes[
            selectedType
            ];


        if (!prefix) {

            accountCode.value = "";

            return;

        }


        accountCode.value =
            `${prefix}-1001`;


        try {

            const data =
                await fetchJSON(
                    `/api/accounts/next-code/${encodeURIComponent(
                        selectedType
                    )}`,
                    {
                        cache:
                            "no-store"
                    }
                );


            accountCode.value =
                data.account_code;


        } catch (error) {

            console.error(
                "NEXT ACCOUNT CODE ERROR:",
                error
            );

        }

    }


    accountType.addEventListener(
        "change",
        async () => {

            accountCode.value = "";

            await getNextAccountCode();

        }
    );


    accountForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const type =
                accountType.value;


            const code =
                accountCode
                    .value
                    .trim();


            const name =
                accountName
                    ?.value
                    .trim() || "";


            if (
                !type ||
                !code ||
                !name
            ) {

                alert(
                    "Please complete all account fields."
                );

                return;

            }


            const expectedPrefix =
                accountPrefixes[type];


            if (
                !code.startsWith(
                    `${expectedPrefix}-`
                )
            ) {

                alert(
                    `Invalid code for ${type}.`
                );

                await getNextAccountCode();

                return;

            }


            const submitButton =
                accountForm
                    .querySelector(
                        'button[type="submit"]'
                    );


            const originalText =
                submitButton
                    ?.textContent ||
                "Submit";


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Saving...";

            }


            try {

                await fetchJSON(
                    "/api/accounts",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                account_code:
                                    code,

                                account_name:
                                    name,

                                account_type:
                                    type
                            })
                    }
                );


                if (accountName) {

                    accountName.value =
                        "";

                }


                await loadAccounts();

                await getNextAccountCode();


                alert(
                    `${code} - ${name} created successfully.`
                );

                hideAccountForm();

            } catch (error) {

                alert(
                    error.message
                );


            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        originalText;

                }

            }

        }
    );


    if (accountSearch) {

        accountSearch.addEventListener(
            "input",
            () => {

                const search =
                    accountSearch
                        .value
                        .trim()
                        .toLowerCase();


                if (!search) {

                    renderAccounts(
                        accounts
                    );

                    return;

                }


                const filtered =
                    accounts.filter(
                        account => {

                            return [
                                account.account_code,
                                account.account_name,
                                account.account_type
                            ]
                                .some(
                                    value =>
                                        String(
                                            value || ""
                                        )
                                            .toLowerCase()
                                            .includes(
                                                search
                                            )
                                );

                        }
                    );


                renderAccounts(
                    filtered
                );

            }
        );

    }


    if (createAccountBtn) {

        createAccountBtn
            .addEventListener(
                "click",
                async () => {

                    if (accountFormPanel?.hidden) {

                        if (accountName) {

                            accountName.value =
                                "";

                        }

                        try {
                            await getNextAccountCode();
                        } catch (error) {
                            console.error(
                                "NEXT ACCOUNT CODE ERROR:",
                                error
                            );
                            alert(error.message);
                            return;
                        }

                        showAccountForm();

                    } else {

                        hideAccountForm();

                    }

                }
            );

    }

    cancelAccountBtn?.addEventListener(
        "click",
        () => {

            accountForm.reset();
            hideAccountForm();

        }
    );

    /* =====================================================
   CHART OF ACCOUNTS - EXCEL IMPORT / EXPORT
===================================================== */

    function normalizeImportedAccountType(value) {

        const normalized =
            String(
                value ||
                ""
            )
                .trim()
                .toLowerCase();


        const aliases = {

            asset:
                "Assets",

            assets:
                "Assets",

            liability:
                "Liabilities",

            liabilities:
                "Liabilities",

            equity:
                "Equity",

            revenue:
                "Revenue",

            revenues:
                "Revenue",

            expense:
                "Expenses",

            expenses:
                "Expenses"

        };


        return aliases[
            normalized
        ] || "";

    }


    async function fetchNextCodeForType(
        type
    ) {

        const response =
            await fetch(

                `/api/accounts/next-code/${encodeURIComponent(
                    type
                )}`,

                {
                    cache:
                        "no-store"
                }

            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(

                data.message ||

                "Unable to generate account code."

            );

        }


        return data.account_code;

    }


    /* =====================================================
       ENABLE EXCEL ON CHART OF ACCOUNTS
    ===================================================== */

    setupExcelModule({

        key:
            "chartOfAccounts",


        label:
            "Chart of Accounts",


        toolbarSelector:
            ".coa-toolbar-right",


        fallbackToolbarSelector:
            ".coa-toolbar",


        sheetName:
            "Chart of Accounts",


        fileBaseName:
            "NEURA_Chart_of_Accounts",


        columns: [

            {

                header:
                    "Account Code",

                key:
                    "account_code",

                aliases: [
                    "code",
                    "accountcode"
                ],

                minWidth:
                    16,

                maxWidth:
                    22

            },

            {

                header:
                    "Account Name",

                key:
                    "account_name",

                aliases: [
                    "name",
                    "accountname"
                ],

                minWidth:
                    24,

                maxWidth:
                    42

            },

            {

                header:
                    "Account Type",

                key:
                    "account_type",

                aliases: [
                    "type",
                    "accounttype"
                ],

                minWidth:
                    16,

                maxWidth:
                    22

            }

        ],


        /* =====================================================
           EXPORT DATA
        ===================================================== */

        getExportRows:
            () =>

                accounts.map(
                    account => ({

                        account_code:
                            account
                                .account_code,

                        account_name:
                            account
                                .account_name,

                        account_type:
                            account
                                .account_type

                    })
                ),


        /* =====================================================
           IMPORT DATA
        ===================================================== */

        importRows:
            async rows => {

                const existingCodes =
                    new Set(

                        accounts.map(
                            account =>

                                String(
                                    account
                                        .account_code ||
                                    ""
                                )
                                    .trim()
                                    .toUpperCase()

                        )

                    );


                let successCount =
                    0;


                let duplicateCount =
                    0;


                let invalidCount =
                    0;


                let failedCount =
                    0;


                for (
                    const row
                    of rows
                ) {

                    /* =========================
                       ACCOUNT TYPE
                    ========================= */

                    const type =
                        normalizeImportedAccountType(
                            row.account_type
                        );


                    /* =========================
                       ACCOUNT NAME
                    ========================= */

                    const name =
                        String(
                            row.account_name ||
                            ""
                        )
                            .trim();


                    /* =========================
                       ACCOUNT CODE
                    ========================= */

                    let code =
                        String(
                            row.account_code ||
                            ""
                        )
                            .trim()
                            .toUpperCase();


                    /* =========================
                       VALIDATE TYPE + NAME
                    ========================= */

                    if (
                        !type ||
                        !name
                    ) {

                        invalidCount++;

                        continue;

                    }


                    /* =========================
                       AUTO GENERATE CODE
                       IF BLANK
                    ========================= */

                    if (
                        !code
                    ) {

                        try {

                            code =
                                await fetchNextCodeForType(
                                    type
                                );


                        } catch (
                        error
                        ) {

                            failedCount++;


                            console.error(
                                "IMPORT ACCOUNT CODE ERROR:",
                                error
                            );


                            continue;

                        }

                    }


                    /* =========================
                       CHECK PREFIX
                    ========================= */

                    const expectedPrefix =
                        accountPrefixes[
                        type
                        ];


                    if (

                        !code.startsWith(
                            `${expectedPrefix}-`
                        )

                    ) {

                        invalidCount++;

                        continue;

                    }


                    /* =========================
                       CHECK DUPLICATE
                    ========================= */

                    if (
                        existingCodes
                            .has(
                                code
                            )
                    ) {

                        duplicateCount++;

                        continue;

                    }


                    /* =========================
                       SAVE TO MYSQL
                    ========================= */

                    try {

                        const response =
                            await fetch(

                                "/api/accounts",

                                {

                                    method:
                                        "POST",


                                    headers: {

                                        "Content-Type":
                                            "application/json"

                                    },


                                    body:
                                        JSON.stringify({

                                            account_code:
                                                code,

                                            account_name:
                                                name,

                                            account_type:
                                                type

                                        })

                                }

                            );


                        const data =
                            await response
                                .json();


                        if (
                            !response.ok
                        ) {

                            const message =
                                String(
                                    data.message ||
                                    ""
                                );


                            if (

                                /already exists|duplicate/i
                                    .test(
                                        message
                                    )

                            ) {

                                duplicateCount++;


                                existingCodes
                                    .add(
                                        code
                                    );


                                continue;

                            }


                            throw new Error(

                                message ||

                                "Unable to import account."

                            );

                        }


                        existingCodes
                            .add(
                                code
                            );


                        successCount++;


                    } catch (
                    error
                    ) {

                        failedCount++;


                        console.error(

                            "IMPORT ACCOUNT ERROR:",

                            error

                        );

                    }

                }


                /* =========================
                   IMPORT SUMMARY
                ========================= */

                return {

                    successCount,

                    duplicateCount,

                    invalidCount,

                    failedCount,


                    message:

                        `Chart of Accounts import finished.\n` +

                        `Imported: ${successCount}\n` +

                        `Duplicates skipped: ${duplicateCount}\n` +

                        `Invalid rows skipped: ${invalidCount}\n` +

                        `Failed: ${failedCount}`

                };

            },


        /* =====================================================
           REFRESH AFTER IMPORT
        ===================================================== */

        onImportComplete:
            async () => {

                await loadAccounts();

                await getNextAccountCode();

            },


        /* =====================================================
           EXCEL TEMPLATE
           ACCOUNT TYPE DROPDOWN
        ===================================================== */

        configureTemplate:
            worksheet => {

                for (

                    let rowNumber =
                        2;

                    rowNumber <=
                    500;

                    rowNumber++

                ) {

                    worksheet
                        .getCell(
                            `C${rowNumber}`
                        )
                        .dataValidation =
                    {

                        type:
                            "list",

                        allowBlank:
                            false,

                        formulae: [

                            '"Assets,Liabilities,Equity,Revenue,Expenses"'

                        ]

                    };

                }

            }

    });

    async function initializeChartOfAccounts() {

        await loadAccounts();

        await getNextAccountCode();

    }


    initializeChartOfAccounts();

}


/* =========================================================
   PURCHASE JOURNAL
========================================================= */

function initPurchaseJournal() {

    const batchForm =
        document.querySelector(
            "#purchaseBatchForm"
        );

    const batchCode =
        document.querySelector(
            "#batchCode"
        );

    const batchName =
        document.querySelector(
            "#batchName"
        );

    const batchTableBody =
        document.querySelector(
            "#purchaseBatchTableBody"
        );

    const batchSelect =
        document.querySelector(
            "#purchaseBatch"
        );

    const showBatchFormBtn =
        document.querySelector(
            "#showBatchFormBtn"
        );

    const batchFormPanel =
        document.querySelector(
            "#batchFormPanel"
        );


    const purchaseEntryForm =
        document.querySelector(
            "#purchaseEntryForm"
        );

    const purchaseDate =
        document.querySelector(
            "#purchaseDate"
        );

    const purchaseDocumentNo =
        document.querySelector(
            "#purchaseDocumentNo"
        );

    const purchasePayee =
        document.querySelector(
            "#purchasePayee"
        );

    const purchaseDebitAccount =
        document.querySelector(
            "#purchaseDebitAccount"
        );

    const purchaseDebitAmount =
        document.querySelector(
            "#purchaseDebitAmount"
        );

    const purchaseCreditAccount =
        document.querySelector(
            "#purchaseCreditAccount"
        );

    const purchaseCreditAmount =
        document.querySelector(
            "#purchaseCreditAmount"
        );

    const purchaseParticulars =
        document.querySelector(
            "#purchaseParticulars"
        );

    const purchaseBusinessActivity =
        document.querySelector(
            "#purchaseBusinessActivity"
        );

    const purchaseDebitTotal =
        document.querySelector(
            "#purchaseDebitTotal"
        );

    const purchaseCreditTotal =
        document.querySelector(
            "#purchaseCreditTotal"
        );

    const purchaseDifference =
        document.querySelector(
            "#purchaseDifference"
        );

    const purchaseJournalTableBody =
        document.querySelector(
            "#purchaseJournalTableBody"
        );


    if (
        !batchForm ||
        !batchTableBody ||
        !batchSelect ||
        !purchaseEntryForm ||
        !purchaseDebitAccount ||
        !purchaseCreditAccount
    ) {

        return;

    }


    let purchaseBatches = [];


    function setToday() {

        if (
            purchaseDate &&
            !purchaseDate.value
        ) {

            purchaseDate.value =
                getLocalDateString();

        }

    }


    function updatePurchaseTotals() {

        const debit =
            Number(
                purchaseDebitAmount
                    ?.value
            ) || 0;


        const credit =
            Number(
                purchaseCreditAmount
                    ?.value
            ) || 0;


        if (purchaseDebitTotal) {

            purchaseDebitTotal.textContent =
                formatPeso(
                    debit
                );

        }


        if (purchaseCreditTotal) {

            purchaseCreditTotal.textContent =
                formatPeso(
                    credit
                );

        }


        if (purchaseDifference) {

            purchaseDifference.textContent =
                formatPeso(
                    Math.abs(
                        debit -
                        credit
                    )
                );

        }

    }


    async function loadPurchaseAccounts() {

        const data =
            await fetchJSON(
                "/api/accounts",
                {
                    cache:
                        "no-store"
                }
            );


        const options =
            (
                data.accounts ||
                []
            )
                .map(
                    account => `
                        <option
                            value="${Number(
                        account.account_id
                    )}"
                        >
                            ${escapeHTML(
                        account.account_code
                    )}
                            -
                            ${escapeHTML(
                        account.account_name
                    )}
                        </option>
                    `
                )
                .join("");


        purchaseDebitAccount.innerHTML = `
            <option value="">
                Select Account
            </option>

            ${options}
        `;


        purchaseCreditAccount.innerHTML = `
            <option value="">
                Select Account
            </option>

            ${options}
        `;

    }


    function renderPurchaseBatches() {

        if (
            !purchaseBatches.length
        ) {

            batchTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="3">
                        No purchase batches found.
                    </td>
                </tr>
            `;


            batchSelect.innerHTML = `
                <option value="">
                    Select Batch
                </option>
            `;


            return;

        }


        batchTableBody.innerHTML =
            purchaseBatches
                .map(
                    batch => `
                        <tr>

                            <td>
                                ${escapeHTML(
                        batch.batch_code
                    )}
                            </td>

                            <td>
                                ${escapeHTML(
                        batch.batch_name
                    )}
                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="
                                        secondary-btn
                                        use-purchase-batch-btn
                                    "
                                    data-batch-id="${Number(
                        batch.batch_id
                    )}"
                                >
                                    Use Batch
                                </button>

                            </td>

                        </tr>
                    `
                )
                .join("");


        batchSelect.innerHTML = `
            <option value="">
                Select Batch
            </option>

            ${purchaseBatches
                .map(
                    batch => `
                        <option
                            value="${Number(
                        batch.batch_id
                    )}"
                        >
                            ${escapeHTML(
                        batch.batch_code
                    )}
                            -
                            ${escapeHTML(
                        batch.batch_name
                    )}
                        </option>
                    `
                )
                .join("")
            }
        `;

    }


    async function loadPurchaseBatches() {

        batchTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="3">
                    Loading batches...
                </td>
            </tr>
        `;


        try {

            const data =
                await fetchJSON(
                    "/api/purchase-batches",
                    {
                        cache:
                            "no-store"
                    }
                );


            purchaseBatches =
                data.batches || [];


            renderPurchaseBatches();


        } catch (error) {

            console.error(
                "LOAD PURCHASE BATCHES ERROR:",
                error
            );


            batchTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="3">
                        Unable to load purchase batches.
                    </td>
                </tr>
            `;

        }

    }


    async function loadPurchaseJournal() {

        if (
            !purchaseJournalTableBody
        ) {

            return;

        }


        purchaseJournalTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="11">
                    Loading purchase journal...
                </td>
            </tr>
        `;


        try {

            const data =
                await fetchJSON(
                    "/api/purchase-journal",
                    {
                        cache:
                            "no-store"
                    }
                );


            const entries =
                data.entries || [];


            if (!entries.length) {

                purchaseJournalTableBody.innerHTML = `
                    <tr class="empty-row">
                        <td colspan="11">
                            No purchase journal entries.
                        </td>
                    </tr>
                `;

                return;

            }


            purchaseJournalTableBody.innerHTML =
                entries
                    .map(
                        entry => `
                            <tr>

                                <td>
                                    ${escapeHTML(
                            entry.entry_date
                        )}
                                </td>

                                <td>
                                    ${escapeHTML(
                            entry.document_no
                        )}
                                </td>

                                <td>
                                    ${escapeHTML(
                            entry.payee
                        )}
                                </td>

                                <td>
                                    ${escapeHTML(
                            entry.debit_account_code
                        )}
                                    -
                                    ${escapeHTML(
                            entry.debit_account_name
                        )}
                                </td>

                                <td>
                                    ${formatPeso(
                            entry.debit_amount
                        )}
                                </td>

                                <td>
                                    ${escapeHTML(
                            entry.credit_account_code
                        )}
                                    -
                                    ${escapeHTML(
                            entry.credit_account_name
                        )}
                                </td>

                                <td>
                                    ${formatPeso(
                            entry.credit_amount
                        )}
                                </td>

                                <td>
                                    ${escapeHTML(
                            entry.particulars ||
                            ""
                        )}
                                </td>

                                <td>
                                    ${escapeHTML(
                            entry.business_activity ||
                            ""
                        )}
                                </td>

                                <td>
                                    ${escapeHTML(
                            entry.status
                        )}
                                </td>

                                <td>

    ${entry.status ===
                                "Posted"

                                ? `

                <button
                    type="button"
                    class="
                        secondary-btn
                        purchase-cancel-entry-btn
                    "
                    data-entry-id="${Number(
                                    entry.entry_id
                                )}"
                    data-document-no="${escapeHTML(
                                    entry.document_no
                                )}"
                >
                    Cancel
                </button>

            `

                                : `

                <span>
                    Cancelled
                </span>

            `
                            }

</td>

                            </tr>
                        `
                    )
                    .join("");


        } catch (error) {

            console.error(
                "LOAD PURCHASE JOURNAL ERROR:",
                error
            );


            purchaseJournalTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="11">
                        Unable to load purchase journal.
                    </td>
                </tr>
            `;

        }

    }


    if (showBatchFormBtn) {

        showBatchFormBtn
            .addEventListener(
                "click",
                () => {

                    batchFormPanel
                        ?.scrollIntoView({
                            behavior:
                                "smooth",

                            block:
                                "center"
                        });


                    batchCode?.focus();

                }
            );

    }


    batchTableBody.addEventListener(
        "click",
        event => {

            const button =
                event.target
                    .closest(
                        ".use-purchase-batch-btn"
                    );


            if (!button) {

                return;

            }


            batchSelect.value =
                button.dataset.batchId;


            purchaseEntryForm
                .scrollIntoView({
                    behavior:
                        "smooth",

                    block:
                        "start"
                });

        }
    );


    batchForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const code =
                batchCode
                    ?.value
                    .trim()
                    .toUpperCase() ||
                "";


            const name =
                batchName
                    ?.value
                    .trim()
                    .toUpperCase() ||
                "";


            if (
                !code ||
                !name
            ) {

                alert(
                    "Please complete Batch Code and Batch Name."
                );

                return;

            }


            const submitButton =
                batchForm
                    .querySelector(
                        'button[type="submit"]'
                    );


            const originalText =
                submitButton
                    ?.textContent ||
                "Submit";


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Saving...";

            }


            try {

                const data =
                    await fetchJSON(
                        "/api/purchase-batches",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    batch_code:
                                        code,

                                    batch_name:
                                        name
                                })
                        }
                    );


                if (batchCode) {

                    batchCode.value =
                        "";

                }


                if (batchName) {

                    batchName.value =
                        "";

                }


                await loadPurchaseBatches();


                if (
                    data.batch
                        ?.batch_id
                ) {

                    batchSelect.value =
                        String(
                            data.batch
                                .batch_id
                        );

                }


                alert(
                    `${code} - ${name} created successfully.`
                );


            } catch (error) {

                alert(
                    error.message
                );


            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        originalText;

                }

            }

        }
    );


    purchaseDebitAmount
        ?.addEventListener(
            "input",
            updatePurchaseTotals
        );


    purchaseCreditAmount
        ?.addEventListener(
            "input",
            updatePurchaseTotals
        );


    purchaseEntryForm
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const debitAmount =
                    Number(
                        purchaseDebitAmount
                            ?.value
                    ) || 0;


                const creditAmount =
                    Number(
                        purchaseCreditAmount
                            ?.value
                    ) || 0;


                if (
                    !batchSelect.value
                ) {

                    alert(
                        "Please select a purchase batch."
                    );

                    return;

                }


                if (
                    !purchaseDate
                        ?.value ||

                    !purchaseDocumentNo
                        ?.value
                        .trim() ||

                    !purchasePayee
                        ?.value
                        .trim() ||

                    !purchaseDebitAccount
                        .value ||

                    !purchaseCreditAccount
                        .value
                ) {

                    alert(
                        "Please complete all required purchase entry fields."
                    );

                    return;

                }


                if (
                    debitAmount <= 0 ||
                    creditAmount <= 0
                ) {

                    alert(
                        "Debit and Credit amounts must be greater than zero."
                    );

                    return;

                }


                if (
                    Number(
                        purchaseDebitAccount.value
                    ) ===
                    Number(
                        purchaseCreditAccount.value
                    )
                ) {

                    alert(
                        "Debit and Credit accounts must be different."
                    );

                    return;

                }


                if (
                    Math.abs(
                        debitAmount -
                        creditAmount
                    ) >= 0.005
                ) {

                    alert(
                        "The journal entry is not balanced. Total Debit must equal Total Credit."
                    );

                    return;

                }


                const submitButton =
                    purchaseEntryForm
                        .querySelector(
                            'button[type="submit"]'
                        );


                const originalText =
                    submitButton
                        ?.textContent ||
                    "Post Entry";


                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        "Posting...";

                }


                try {

                    await fetchJSON(
                        "/api/purchase-journal",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    batch_id:
                                        Number(
                                            batchSelect.value
                                        ),

                                    entry_date:
                                        purchaseDate.value,

                                    document_no:
                                        purchaseDocumentNo
                                            .value
                                            .trim(),

                                    payee:
                                        purchasePayee
                                            .value
                                            .trim(),

                                    debit_account_id:
                                        Number(
                                            purchaseDebitAccount
                                                .value
                                        ),

                                    debit_amount:
                                        debitAmount,

                                    credit_account_id:
                                        Number(
                                            purchaseCreditAccount
                                                .value
                                        ),

                                    credit_amount:
                                        creditAmount,

                                    particulars:
                                        purchaseParticulars
                                            ?.value
                                            .trim() ||
                                        "",

                                    business_activity:
                                        purchaseBusinessActivity
                                            ?.value
                                            .trim() ||
                                        ""

                                })
                        }
                    );


                    const selectedBatch =
                        batchSelect.value;


                    purchaseEntryForm.reset();


                    batchSelect.value =
                        selectedBatch;


                    setToday();

                    updatePurchaseTotals();


                    await loadPurchaseJournal();


                    alert(
                        "Purchase journal entry posted successfully."
                    );


                } catch (error) {

                    alert(
                        error.message
                    );


                } finally {

                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        submitButton.textContent =
                            originalText;

                    }

                }

            }
        );

    /* =========================================================
CANCEL / VOID PURCHASE JOURNAL ENTRY
========================================================= */

    if (purchaseJournalTableBody) {

        purchaseJournalTableBody.addEventListener(
            "click",
            async event => {

                const button =
                    event.target.closest(
                        ".purchase-cancel-entry-btn"
                    );


                if (!button) {

                    return;

                }


                const entryId =
                    Number(
                        button.dataset
                            .entryId
                    );


                const documentNo =
                    button.dataset
                        .documentNo ||
                    "this transaction";


                if (
                    !Number.isInteger(
                        entryId
                    ) ||
                    entryId <= 0
                ) {

                    return;

                }


                const confirmed =
                    window.confirm(

                        `Cancel purchase transaction ${documentNo}?\n\n` +

                        "The transaction will remain in the journal history " +

                        "but its status will become Cancelled."

                    );


                if (!confirmed) {

                    return;

                }


                const originalText =
                    button.textContent;


                button.disabled =
                    true;


                button.textContent =
                    "Cancelling...";


                try {

                    await fetchJSON(

                        `/api/purchase-journal/${entryId}/cancel`,

                        {
                            method:
                                "PATCH"
                        }

                    );


                    await loadPurchaseJournal();


                    alert(
                        `${documentNo} cancelled successfully.`
                    );


                } catch (error) {

                    console.error(
                        "CANCEL PURCHASE ENTRY ERROR:",
                        error
                    );


                    alert(
                        error.message
                    );


                    button.disabled =
                        false;


                    button.textContent =
                        originalText;

                }

            }
        );

    }


    async function initializePurchaseJournal() {

        setToday();

        updatePurchaseTotals();


        const tasks = [

            loadPurchaseAccounts(),

            loadPurchaseBatches(),

            loadPurchaseJournal()

        ];


        const results =
            await Promise.allSettled(
                tasks
            );


        results.forEach(
            result => {

                if (
                    result.status ===
                    "rejected"
                ) {

                    console.error(
                        "PURCHASE INITIALIZATION ERROR:",
                        result.reason
                    );

                }

            }
        );

    }


    initializePurchaseJournal();

}


/* =========================================================
   SALES JOURNAL
========================================================= */

function initSalesJournal() {

    const batchForm =
        document.querySelector(
            "#salesBatchForm"
        );

    const batchCode =
        document.querySelector(
            "#salesBatchCode"
        );

    const batchName =
        document.querySelector(
            "#salesBatchName"
        );

    const batchTableBody =
        document.querySelector(
            "#salesBatchTableBody"
        );

    const batchSelect =
        document.querySelector(
            "#salesBatch"
        );

    const showBatchFormBtn =
        document.querySelector(
            "#showSalesBatchFormBtn"
        );

    const batchFormPanel =
        document.querySelector(
            "#salesBatchFormPanel"
        );

    const salesEntryForm =
        document.querySelector(
            "#salesEntryForm"
        );

    const salesDate =
        document.querySelector(
            "#salesDate"
        );

    const salesDocumentNo =
        document.querySelector(
            "#salesDocumentNo"
        );

    const salesCustomer =
        document.querySelector(
            "#salesCustomer"
        );

    const salesDebitAccount =
        document.querySelector(
            "#salesDebitAccount"
        );

    const salesDebitAmount =
        document.querySelector(
            "#salesDebitAmount"
        );

    const salesCreditAccount =
        document.querySelector(
            "#salesCreditAccount"
        );

    const salesCreditAmount =
        document.querySelector(
            "#salesCreditAmount"
        );

    const salesParticulars =
        document.querySelector(
            "#salesParticulars"
        );

    const salesBusinessActivity =
        document.querySelector(
            "#salesBusinessActivity"
        );

    const salesDebitTotal =
        document.querySelector(
            "#salesDebitTotal"
        );

    const salesCreditTotal =
        document.querySelector(
            "#salesCreditTotal"
        );

    const salesDifference =
        document.querySelector(
            "#salesDifference"
        );

    const salesJournalTableBody =
        document.querySelector(
            "#salesJournalTableBody"
        );

    if (
        !batchForm ||
        !batchTableBody ||
        !batchSelect ||
        !salesEntryForm ||
        !salesDebitAccount ||
        !salesCreditAccount
    ) {

        return;

    }

    let salesBatches = [];

    function setToday() {

        if (
            salesDate &&
            !salesDate.value
        ) {

            salesDate.value =
                getLocalDateString();

        }

    }

    function updateSalesTotals() {

        const debit =
            Number(
                salesDebitAmount?.value
            ) || 0;

        const credit =
            Number(
                salesCreditAmount?.value
            ) || 0;

        if (salesDebitTotal) {

            salesDebitTotal.textContent =
                formatPeso(
                    debit
                );

        }

        if (salesCreditTotal) {

            salesCreditTotal.textContent =
                formatPeso(
                    credit
                );

        }

        if (salesDifference) {

            salesDifference.textContent =
                formatPeso(
                    Math.abs(
                        debit -
                        credit
                    )
                );

        }

    }

    async function loadSalesAccounts() {

        const data =
            await fetchJSON(
                "/api/accounts",
                {
                    cache:
                        "no-store"
                }
            );

        const options =
            (data.accounts || [])
                .map(
                    account => `
                        <option value="${Number(account.account_id)}">
                            ${escapeHTML(account.account_code)}
                            -
                            ${escapeHTML(account.account_name)}
                        </option>
                    `
                )
                .join("");

        salesDebitAccount.innerHTML = `
            <option value="">Select Account</option>
            ${options}
        `;

        salesCreditAccount.innerHTML = `
            <option value="">Select Account</option>
            ${options}
        `;

    }

    function renderSalesBatches() {

        if (!salesBatches.length) {

            batchTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="3">No sales batches found.</td>
                </tr>
            `;

            batchSelect.innerHTML = `
                <option value="">Select Batch</option>
            `;

            return;

        }

        batchTableBody.innerHTML =
            salesBatches
                .map(
                    batch => `
                        <tr>
                            <td>${escapeHTML(batch.batch_code)}</td>
                            <td>${escapeHTML(batch.batch_name)}</td>
                            <td>
                                <button
                                    type="button"
                                    class="secondary-btn use-sales-batch-btn"
                                    data-batch-id="${Number(batch.batch_id)}"
                                >
                                    Use Batch
                                </button>
                            </td>
                        </tr>
                    `
                )
                .join("");

        batchSelect.innerHTML = `
            <option value="">Select Batch</option>
            ${salesBatches
                .map(
                    batch => `
                        <option value="${Number(batch.batch_id)}">
                            ${escapeHTML(batch.batch_code)}
                            -
                            ${escapeHTML(batch.batch_name)}
                        </option>
                    `
                )
                .join("")}
        `;

    }

    async function loadSalesBatches() {

        batchTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="3">Loading batches...</td>
            </tr>
        `;

        try {

            const data =
                await fetchJSON(
                    "/api/sales-batches",
                    {
                        cache:
                            "no-store"
                    }
                );

            salesBatches =
                data.batches || [];

            renderSalesBatches();

        } catch (error) {

            console.error(
                "LOAD SALES BATCHES ERROR:",
                error
            );

            batchTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="3">Unable to load sales batches.</td>
                </tr>
            `;

        }

    }

    async function loadSalesJournal() {

        if (!salesJournalTableBody) {
            return;
        }

        salesJournalTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="11">Loading sales journal...</td>
            </tr>
        `;

        try {

            const data =
                await fetchJSON(
                    "/api/sales-journal",
                    {
                        cache:
                            "no-store"
                    }
                );

            const entries =
                data.entries || [];

            if (!entries.length) {

                salesJournalTableBody.innerHTML = `
                    <tr class="empty-row">
                        <td colspan="11">No sales journal entries.</td>
                    </tr>
                `;

                return;

            }

            salesJournalTableBody.innerHTML =
                entries
                    .map(
                        entry => `
                            <tr>
                                <td>${escapeHTML(entry.entry_date)}</td>
                                <td>${escapeHTML(entry.document_no)}</td>
                                <td>${escapeHTML(entry.customer_name)}</td>
                                <td>
                                    ${escapeHTML(entry.debit_account_code)}
                                    -
                                    ${escapeHTML(entry.debit_account_name)}
                                </td>
                                <td>${formatPeso(entry.debit_amount)}</td>
                                <td>
                                    ${escapeHTML(entry.credit_account_code)}
                                    -
                                    ${escapeHTML(entry.credit_account_name)}
                                </td>
                                <td>${formatPeso(entry.credit_amount)}</td>
                                <td>${escapeHTML(entry.particulars || "")}</td>
                                <td>${escapeHTML(entry.business_activity || "")}</td>
                                <td>${escapeHTML(entry.status)}</td>
                            </tr>
                        `
                    )
                    .join("");

        } catch (error) {

            console.error(
                "LOAD SALES JOURNAL ERROR:",
                error
            );

            salesJournalTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="11">Unable to load sales journal.</td>
                </tr>
            `;

        }

    }

    if (showBatchFormBtn) {

        showBatchFormBtn.addEventListener(
            "click",
            () => {

                batchFormPanel?.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                batchCode?.focus();

            }
        );

    }

    batchTableBody.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".use-sales-batch-btn"
                );

            if (!button) {
                return;
            }

            batchSelect.value =
                button.dataset.batchId;

            salesEntryForm.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }
    );

    batchForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const code =
                batchCode?.value.trim().toUpperCase() || "";

            const name =
                batchName?.value.trim().toUpperCase() || "";

            if (!code || !name) {

                alert(
                    "Please complete Batch Code and Batch Name."
                );

                return;

            }

            const submitButton =
                batchForm.querySelector(
                    'button[type="submit"]'
                );

            const originalText =
                submitButton?.textContent || "Submit";

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Saving...";
            }

            try {

                const data =
                    await fetchJSON(
                        "/api/sales-batches",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                batch_code: code,
                                batch_name: name
                            })
                        }
                    );

                if (batchCode) {
                    batchCode.value = "";
                }

                if (batchName) {
                    batchName.value = "";
                }

                await loadSalesBatches();

                if (data.batch?.batch_id) {
                    batchSelect.value =
                        String(data.batch.batch_id);
                }

                alert(
                    `${code} - ${name} created successfully.`
                );

            } catch (error) {

                alert(error.message);

            } finally {

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }

            }

        }
    );

    salesDebitAmount?.addEventListener(
        "input",
        updateSalesTotals
    );

    salesCreditAmount?.addEventListener(
        "input",
        updateSalesTotals
    );

    salesEntryForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const debitAmount =
                Number(salesDebitAmount?.value) || 0;

            const creditAmount =
                Number(salesCreditAmount?.value) || 0;

            if (!batchSelect.value) {
                alert("Please select a sales batch.");
                return;
            }

            if (
                !salesDate?.value ||
                !salesDocumentNo?.value.trim() ||
                !salesCustomer?.value.trim() ||
                !salesDebitAccount.value ||
                !salesCreditAccount.value
            ) {
                alert("Please complete all required sales entry fields.");
                return;
            }

            if (debitAmount <= 0 || creditAmount <= 0) {
                alert("Debit and Credit amounts must be greater than zero.");
                return;
            }

            if (
                Number(salesDebitAccount.value) ===
                Number(salesCreditAccount.value)
            ) {
                alert("Debit and Credit accounts must be different.");
                return;
            }

            if (Math.abs(debitAmount - creditAmount) >= 0.005) {
                alert("The journal entry is not balanced. Total Debit must equal Total Credit.");
                return;
            }

            const submitButton =
                salesEntryForm.querySelector(
                    'button[type="submit"]'
                );

            const originalText =
                submitButton?.textContent || "Post Entry";

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Posting...";
            }

            try {

                await fetchJSON(
                    "/api/sales-journal",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            batch_id: Number(batchSelect.value),
                            entry_date: salesDate.value,
                            document_no: salesDocumentNo.value.trim(),
                            customer_name: salesCustomer.value.trim(),
                            debit_account_id: Number(salesDebitAccount.value),
                            debit_amount: debitAmount,
                            credit_account_id: Number(salesCreditAccount.value),
                            credit_amount: creditAmount,
                            particulars: salesParticulars?.value.trim() || "",
                            business_activity: salesBusinessActivity?.value.trim() || ""
                        })
                    }
                );

                const selectedBatch =
                    batchSelect.value;

                salesEntryForm.reset();
                batchSelect.value = selectedBatch;

                setToday();
                updateSalesTotals();
                await loadSalesJournal();

                alert("Sales journal entry posted successfully.");

            } catch (error) {

                alert(error.message);

            } finally {

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }

            }

        }
    );

    async function initializeSalesJournal() {

        setToday();
        updateSalesTotals();

        const tasks = [
            loadSalesAccounts(),
            loadSalesBatches(),
            loadSalesJournal()
        ];

        await Promise.allSettled(tasks);

    }

    initializeSalesJournal();

}


/* =========================================================
   SUPPLIERS
========================================================= */

function initSuppliers() {

    const supplierForm =
        document.querySelector(
            "#supplierForm"
        );

    const supplierFormPanel =
        document.querySelector(
            "#supplierFormPanel"
        );


    let toggleSupplierFormBtn =
        document.querySelector(
            "#toggleSupplierFormBtn"
        );


    let cancelSupplierBtn =
        document.querySelector(
            "#cancelSupplierBtn"
        );


    const importSupplierBtn =
        document.querySelector(
            "#importSupplierBtn"
        );

    const exportSupplierBtn =
        document.querySelector(
            "#exportSupplierBtn"
        );

    const supplierImportFile =
        document.querySelector(
            "#supplierImportFile"
        );


    const supplierCode =
        document.querySelector(
            "#supplierCode"
        );

    const supplierName =
        document.querySelector(
            "#supplierName"
        );

    const supplierAddress =
        document.querySelector(
            "#supplierAddress"
        );

    const supplierTin =
        document.querySelector(
            "#supplierTin"
        );

    const supplierContactPerson =
        document.querySelector(
            "#supplierContactPerson"
        );

    const supplierContactNumber =
        document.querySelector(
            "#supplierContactNumber"
        );

    const supplierEmail =
        document.querySelector(
            "#supplierEmail"
        );

    const supplierType =
        document.querySelector(
            "#supplierType"
        );

    const supplierPaymentTerms =
        document.querySelector(
            "#supplierPaymentTerms"
        );

    const supplierStatus =
        document.querySelector(
            "#supplierStatus"
        );

    const supplierTableBody =
        document.querySelector(
            "#supplierTableBody"
        );

    const supplierSearch =
        document.querySelector(
            "#supplierSearch"
        );


    if (
        !supplierForm ||
        !supplierCode ||
        !supplierName ||
        !supplierTableBody
    ) {

        return;

    }


    /*
        This removes old temporary inline
        Supplier click listeners if they
        are still inside supplier.html.
    */

    if (toggleSupplierFormBtn) {

        const cleanButton =
            toggleSupplierFormBtn
                .cloneNode(true);


        toggleSupplierFormBtn
            .replaceWith(
                cleanButton
            );


        toggleSupplierFormBtn =
            cleanButton;

    }


    if (cancelSupplierBtn) {

        const cleanButton =
            cancelSupplierBtn
                .cloneNode(true);


        cancelSupplierBtn
            .replaceWith(
                cleanButton
            );


        cancelSupplierBtn =
            cleanButton;

    }


    let suppliers = [];

    let editingSupplierId = null;

    const supplierFormTitle =
        supplierFormPanel?.querySelector(
            ".panel-header h2"
        );

    const supplierFormDescription =
        supplierFormPanel?.querySelector(
            ".panel-header p"
        );

    const saveSupplierBtn =
        document.querySelector(
            "#saveSupplierBtn"
        );


    /* =========================================================
       CSV HELPERS
    ========================================================= */

    function normalizeImportHeader(
        header
    ) {

        return String(
            header || ""
        )
            .trim()
            .toLowerCase()
            .replace(
                /\s+/g,
                "_"
            );

    }


    function parseCSVLine(
        line
    ) {

        const result = [];

        let current = "";

        let inQuotes =
            false;


        for (
            let i = 0;
            i < line.length;
            i++
        ) {

            const char =
                line[i];


            const nextChar =
                line[i + 1];


            if (
                char === '"'
            ) {

                if (
                    inQuotes &&
                    nextChar === '"'
                ) {

                    current += '"';

                    i++;

                    continue;

                }


                inQuotes =
                    !inQuotes;


                continue;

            }


            if (
                char === "," &&
                !inQuotes
            ) {

                result.push(
                    current
                );


                current = "";


                continue;

            }


            current += char;

        }


        result.push(
            current
        );


        return result.map(
            value =>
                value.trim()
        );

    }


    function parseCSV(
        text
    ) {

        const lines =
            String(
                text || ""
            )
                .replace(
                    /\r/g,
                    ""
                )
                .split(
                    "\n"
                )
                .filter(
                    line =>
                        line
                            .trim() !==
                        ""
                );


        if (!lines.length) {

            return [];

        }


        const headers =
            parseCSVLine(
                lines[0]
            )
                .map(
                    normalizeImportHeader
                );


        return lines
            .slice(1)
            .map(
                line => {

                    const values =
                        parseCSVLine(
                            line
                        );


                    const row =
                        {};


                    headers.forEach(
                        (
                            header,
                            index
                        ) => {

                            row[header] =
                                values[
                                index
                                ] ||
                                "";

                        }
                    );


                    return row;

                }
            );

    }


    function escapeCSV(
        value
    ) {

        const stringValue =
            String(
                value ??
                ""
            );


        if (
            stringValue.includes(
                ","
            ) ||

            stringValue.includes(
                '"'
            ) ||

            stringValue.includes(
                "\n"
            )
        ) {

            return `"${stringValue.replace(
                /"/g,
                '""'
            )}"`;

        }


        return stringValue;

    }


    function getSupplierCodeNumber(
        code
    ) {

        const match =
            String(
                code || ""
            )
                .match(
                    /^SUP-(\d{4})$/i
                );


        return match
            ? Number(
                match[1]
            )
            : 1;

    }


    /* =========================================================
       SUPPLIER CODE
    ========================================================= */

    async function fetchNextSupplierCode() {

        const data =
            await fetchJSON(
                "/api/suppliers/next-code",
                {
                    cache:
                        "no-store"
                }
            );


        return data.supplier_code;

    }


    async function getNextSupplierCode() {

        supplierCode.value =
            "SUP-0001";


        try {

            supplierCode.value =
                await fetchNextSupplierCode();


        } catch (error) {

            console.error(
                "NEXT SUPPLIER CODE ERROR:",
                error
            );

        }

    }


    /* =========================================================
       SUPPLIER FORM
    ========================================================= */

    function setSupplierCreateMode() {

        editingSupplierId =
            null;


        if (supplierFormTitle) {

            supplierFormTitle.textContent =
                "Create Supplier";

        }


        if (supplierFormDescription) {

            supplierFormDescription.textContent =
                "Add supplier information manually.";

        }


        if (saveSupplierBtn) {

            saveSupplierBtn.textContent =
                "Save Supplier";

        }

    }


    function resetSupplierForm() {

        supplierForm.reset();


        if (supplierStatus) {

            supplierStatus.value =
                "Active";

        }


        if (supplierPaymentTerms) {

            supplierPaymentTerms.value =
                "Cash";

        }


        setSupplierCreateMode();

    }


    /* =========================================================
       EDIT SUPPLIER FORM
    ========================================================= */

    function openSupplierEditForm(
        supplier
    ) {

        editingSupplierId =
            Number(
                supplier.supplier_id
            );


        supplierCode.value =
            supplier.supplier_code ||
            "";


        supplierName.value =
            supplier.supplier_name ||
            "";


        if (supplierAddress) {

            supplierAddress.value =
                supplier.supplier_address ||
                "";

        }


        if (supplierTin) {

            supplierTin.value =
                supplier.tin_number ||
                "";

        }


        if (supplierContactPerson) {

            supplierContactPerson.value =
                supplier.contact_person ||
                "";

        }


        if (supplierContactNumber) {

            supplierContactNumber.value =
                supplier.contact_number ||
                "";

        }


        if (supplierEmail) {

            supplierEmail.value =
                supplier.email ||
                "";

        }


        if (supplierType) {

            supplierType.value =
                supplier.supplier_type ||
                "";

        }


        if (supplierPaymentTerms) {

            supplierPaymentTerms.value =
                supplier.payment_terms ||
                "Cash";

        }


        if (supplierStatus) {

            supplierStatus.value =
                supplier.status ||
                "Active";

        }


        if (supplierFormTitle) {

            supplierFormTitle.textContent =
                "Edit Supplier";

        }


        if (supplierFormDescription) {

            supplierFormDescription.textContent =
                "Update supplier information.";

        }


        if (saveSupplierBtn) {

            saveSupplierBtn.textContent =
                "Update Supplier";

        }


        showSupplierForm();

    }

    function showSupplierForm() {

        if (
            !supplierFormPanel
        ) {

            return;

        }


        supplierFormPanel.hidden =
            false;


        supplierFormPanel
            .classList
            .remove(
                "is-hidden"
            );


        if (
            toggleSupplierFormBtn
        ) {

            toggleSupplierFormBtn
                .textContent =
                "Close Form";

        }


        supplierFormPanel
            .scrollIntoView({
                behavior:
                    "smooth",

                block:
                    "start"
            });


        setTimeout(
            () =>
                supplierName
                    .focus(),
            150
        );

    }


    function hideSupplierForm() {

        if (
            !supplierFormPanel
        ) {

            return;

        }


        supplierFormPanel.hidden =
            true;


        supplierFormPanel
            .classList
            .add(
                "is-hidden"
            );


        if (
            toggleSupplierFormBtn
        ) {

            toggleSupplierFormBtn
                .textContent =
                "+ Create Supplier";

        }

    }


    async function prepareSupplierForm() {

        resetSupplierForm();

        await getNextSupplierCode();

        showSupplierForm();

    }


    /* =========================================================
       LOAD SUPPLIERS
    ========================================================= */

    async function loadSuppliers() {

        supplierTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    Loading suppliers...
                </td>
            </tr>
        `;


        try {

            const data =
                await fetchJSON(
                    "/api/suppliers",
                    {
                        cache:
                            "no-store"
                    }
                );


            suppliers =
                data.suppliers ||
                [];


            renderSuppliers(
                suppliers
            );


        } catch (error) {

            console.error(
                "LOAD SUPPLIERS ERROR:",
                error
            );


            supplierTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="9">
                        Unable to load suppliers.
                    </td>
                </tr>
            `;

        }

    }


    function renderSuppliers(
        supplierList
    ) {

        if (
            !supplierList.length
        ) {

            supplierTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="9">
                        No suppliers found.
                    </td>
                </tr>
            `;


            return;

        }


        supplierTableBody.innerHTML =
            supplierList
                .map(
                    supplier => `
                        <tr>

                            <td
                                class="
                                    supplier-code-cell
                                "
                            >
                                ${escapeHTML(
                        supplier.supplier_code
                    )}
                            </td>


                            <td>

                                <strong
                                    class="
                                        supplier-name-cell
                                    "
                                >
                                    ${escapeHTML(
                        supplier.supplier_name
                    )}
                                </strong>

                            </td>


                            <td>
                                ${escapeHTML(
                        supplier.tin_number ||
                        "—"
                    )}
                            </td>


                            <td>
                                ${escapeHTML(
                        supplier.contact_person ||
                        "—"
                    )}
                            </td>


                            <td>
                                ${escapeHTML(
                        supplier.contact_number ||
                        "—"
                    )}
                            </td>


                            <td>
                                ${escapeHTML(
                        supplier.supplier_type ||
                        "—"
                    )}
                            </td>


                            <td>
                                ${escapeHTML(
                        supplier.payment_terms ||
                        "—"
                    )}
                            </td>


                            <td>

                                <span
                                    class="
                                        supplier-status
                                        ${supplier.status ===
                            "Active"
                            ? "is-active"
                            : "is-inactive"
                        }
                                    "
                                >
                                    ${escapeHTML(
                            supplier.status
                        )}
                                </span>

                            </td>


                           <td>

    <button
        type="button"
        class="
            secondary-btn
            supplier-edit-btn
        "
        data-supplier-id="${Number(
                            supplier.supplier_id
                        )}"
    >
        Edit
    </button>


    <button
        type="button"
        class="
            supplier-delete-btn
        "
        data-supplier-id="${Number(
                            supplier.supplier_id
                        )}"
        data-supplier-name="${escapeHTML(
                            supplier.supplier_name
                        )}"
    >
        Delete
    </button>

</td>

                        </tr>
                    `
                )
                .join("");

    }


    /* =========================================================
    SAVE / UPDATE SUPPLIER
 ========================================================= */

    supplierForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const code =
                supplierCode
                    .value
                    .trim()
                    .toUpperCase();


            const name =
                supplierName
                    .value
                    .trim();


            if (
                !code ||
                !name
            ) {

                alert(
                    "Supplier Code and Supplier Name are required."
                );

                return;

            }


            const isEditing =
                Number.isInteger(
                    editingSupplierId
                ) &&
                editingSupplierId > 0;


            const submitButton =
                supplierForm
                    .querySelector(
                        'button[type="submit"]'
                    );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    isEditing
                        ? "Updating..."
                        : "Saving...";

            }


            try {

                await fetchJSON(

                    isEditing
                        ? `/api/suppliers/${editingSupplierId}`
                        : "/api/suppliers",

                    {
                        method:
                            isEditing
                                ? "PUT"
                                : "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                supplier_code:
                                    code,

                                supplier_name:
                                    name,

                                supplier_address:
                                    supplierAddress
                                        ?.value
                                        .trim() ||
                                    "",

                                tin_number:
                                    supplierTin
                                        ?.value
                                        .trim() ||
                                    "",

                                contact_person:
                                    supplierContactPerson
                                        ?.value
                                        .trim() ||
                                    "",

                                contact_number:
                                    supplierContactNumber
                                        ?.value
                                        .trim() ||
                                    "",

                                email:
                                    supplierEmail
                                        ?.value
                                        .trim() ||
                                    "",

                                supplier_type:
                                    supplierType
                                        ?.value
                                        .trim() ||
                                    "",

                                payment_terms:
                                    supplierPaymentTerms
                                        ?.value ||
                                    "Cash",

                                status:
                                    supplierStatus
                                        ?.value ||
                                    "Active"

                            })

                    }

                );


                alert(

                    isEditing
                        ? `${code} - ${name} updated successfully.`
                        : `${code} - ${name} created successfully.`

                );


                resetSupplierForm();


                await loadSuppliers();


                await getNextSupplierCode();


                hideSupplierForm();


            } catch (error) {

                console.error(

                    isEditing
                        ? "UPDATE SUPPLIER ERROR:"
                        : "CREATE SUPPLIER ERROR:",

                    error

                );


                alert(
                    error.message
                );


            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;


                    submitButton.textContent =
                        editingSupplierId
                            ? "Update Supplier"
                            : "Save Supplier";

                }

            }

        }
    );


    /* =========================================================
       CREATE / CANCEL BUTTON
    ========================================================= */

    toggleSupplierFormBtn
        ?.addEventListener(
            "click",
            async () => {

                if (
                    !supplierFormPanel
                ) {

                    return;

                }


                const isHidden =
                    supplierFormPanel
                        .hidden ||

                    supplierFormPanel
                        .classList
                        .contains(
                            "is-hidden"
                        );


                if (isHidden) {

                    await prepareSupplierForm();

                } else {

                    hideSupplierForm();

                }

            }
        );


    cancelSupplierBtn
        ?.addEventListener(
            "click",
            () => {

                resetSupplierForm();

                hideSupplierForm();

            }
        );


    /* =========================================================
       SEARCH SUPPLIER
    ========================================================= */

    supplierSearch
        ?.addEventListener(
            "input",
            () => {

                const search =
                    supplierSearch
                        .value
                        .trim()
                        .toLowerCase();


                if (!search) {

                    renderSuppliers(
                        suppliers
                    );

                    return;

                }


                const filteredSuppliers =
                    suppliers.filter(
                        supplier => {

                            return [

                                supplier.supplier_code,
                                supplier.supplier_name,
                                supplier.supplier_address,
                                supplier.tin_number,
                                supplier.contact_person,
                                supplier.contact_number,
                                supplier.email,
                                supplier.supplier_type,
                                supplier.payment_terms,
                                supplier.status

                            ]
                                .some(
                                    value =>
                                        String(
                                            value || ""
                                        )
                                            .toLowerCase()
                                            .includes(
                                                search
                                            )
                                );

                        }
                    );


                renderSuppliers(
                    filteredSuppliers
                );

            }
        );

    /* =========================================================
EDIT SUPPLIER
========================================================= */

    supplierTableBody.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".supplier-edit-btn"
                );


            if (!button) {

                return;

            }


            const supplierId =
                Number(
                    button.dataset
                        .supplierId
                );


            if (
                !Number.isInteger(
                    supplierId
                ) ||
                supplierId <= 0
            ) {

                return;

            }


            const supplier =
                suppliers.find(
                    item =>
                        Number(
                            item.supplier_id
                        ) ===
                        supplierId
                );


            if (!supplier) {

                alert(
                    "Supplier record not found."
                );

                return;

            }


            openSupplierEditForm(
                supplier
            );

        }
    );


    /* =========================================================
       DELETE SUPPLIER
    ========================================================= */

    supplierTableBody.addEventListener(
        "click",
        async event => {

            const button =
                event.target
                    .closest(
                        ".supplier-delete-btn"
                    );


            if (!button) {

                return;

            }


            const supplierId =
                Number(
                    button.dataset
                        .supplierId
                );


            const supplierDisplayName =
                button.dataset
                    .supplierName ||
                "this supplier";


            if (
                !Number.isInteger(
                    supplierId
                ) ||

                supplierId <= 0
            ) {

                return;

            }


            if (
                !window.confirm(
                    `Delete ${supplierDisplayName}?`
                )
            ) {

                return;

            }


            const originalText =
                button.textContent;


            button.disabled =
                true;


            button.textContent =
                "Deleting...";


            try {

                await fetchJSON(
                    `/api/suppliers/${supplierId}`,
                    {
                        method:
                            "DELETE"
                    }
                );


                await loadSuppliers();

                await getNextSupplierCode();


            } catch (error) {

                alert(
                    error.message
                );


                button.disabled =
                    false;


                button.textContent =
                    originalText;

            }

        }
    );


    /* =========================================================
       IMPORT SUPPLIERS
    ========================================================= */

    if (
        importSupplierBtn &&
        supplierImportFile
    ) {

        importSupplierBtn
            .addEventListener(
                "click",
                () => {

                    supplierImportFile
                        .click();

                }
            );


        supplierImportFile
            .addEventListener(
                "change",
                async event => {

                    const file =
                        event.target
                            .files?.[0];


                    if (!file) {

                        return;

                    }


                    try {

                        const rows =
                            parseCSV(
                                await file.text()
                            );


                        if (
                            !rows.length
                        ) {

                            alert(
                                "No supplier data found in the CSV file."
                            );

                            return;

                        }


                        if (
                            !window.confirm(
                                `Import ${rows.length} supplier row(s)?`
                            )
                        ) {

                            return;

                        }


                        let nextNumber =
                            getSupplierCodeNumber(
                                await fetchNextSupplierCode()
                            );


                        let successCount =
                            0;


                        let failCount =
                            0;


                        for (
                            const row
                            of rows
                        ) {

                            const supplierNameValue =
                                String(
                                    row.supplier_name ||
                                    ""
                                )
                                    .trim();


                            if (
                                !supplierNameValue
                            ) {

                                failCount++;

                                continue;

                            }


                            let finalCode =
                                String(
                                    row.supplier_code ||
                                    ""
                                )
                                    .trim()
                                    .toUpperCase();


                            if (
                                !finalCode
                            ) {

                                finalCode =
                                    `SUP-${String(
                                        nextNumber
                                    ).padStart(
                                        4,
                                        "0"
                                    )}`;


                                nextNumber++;

                            }


                            try {

                                await fetchJSON(
                                    "/api/suppliers",
                                    {
                                        method:
                                            "POST",

                                        headers: {
                                            "Content-Type":
                                                "application/json"
                                        },

                                        body:
                                            JSON.stringify({

                                                supplier_code:
                                                    finalCode,

                                                supplier_name:
                                                    supplierNameValue,

                                                supplier_address:
                                                    String(
                                                        row.supplier_address ||
                                                        ""
                                                    ).trim(),

                                                tin_number:
                                                    String(
                                                        row.tin_number ||
                                                        ""
                                                    ).trim(),

                                                contact_person:
                                                    String(
                                                        row.contact_person ||
                                                        ""
                                                    ).trim(),

                                                contact_number:
                                                    String(
                                                        row.contact_number ||
                                                        ""
                                                    ).trim(),

                                                email:
                                                    String(
                                                        row.email ||
                                                        ""
                                                    ).trim(),

                                                supplier_type:
                                                    String(
                                                        row.supplier_type ||
                                                        ""
                                                    ).trim(),

                                                payment_terms:
                                                    String(
                                                        row.payment_terms ||
                                                        "Cash"
                                                    ).trim(),

                                                status:
                                                    String(
                                                        row.status ||
                                                        "Active"
                                                    )
                                                        .trim()
                                                        .toLowerCase() ===
                                                        "inactive"
                                                        ? "Inactive"
                                                        : "Active"

                                            })
                                    }
                                );


                                successCount++;


                            } catch (
                            error
                            ) {

                                console.error(
                                    "SUPPLIER IMPORT ROW ERROR:",
                                    error
                                );


                                failCount++;

                            }

                        }


                        await loadSuppliers();

                        await getNextSupplierCode();


                        alert(
                            `Import finished.\nSuccessful: ${successCount}\nFailed: ${failCount}`
                        );


                    } catch (error) {

                        console.error(
                            "SUPPLIER IMPORT ERROR:",
                            error
                        );


                        alert(
                            error.message
                        );


                    } finally {

                        supplierImportFile.value =
                            "";

                    }

                }
            );

    }


    /* =========================================================
       EXPORT SUPPLIERS
    ========================================================= */

    exportSupplierBtn
        ?.addEventListener(
            "click",
            () => {

                if (
                    !suppliers.length
                ) {

                    alert(
                        "No supplier records to export."
                    );

                    return;

                }


                const headers = [

                    "supplier_code",
                    "supplier_name",
                    "supplier_address",
                    "tin_number",
                    "contact_person",
                    "contact_number",
                    "email",
                    "supplier_type",
                    "payment_terms",
                    "status"

                ];


                const lines = [
                    headers.join(",")
                ];


                suppliers.forEach(
                    supplier => {

                        lines.push(
                            [

                                supplier.supplier_code,
                                supplier.supplier_name,
                                supplier.supplier_address,
                                supplier.tin_number,
                                supplier.contact_person,
                                supplier.contact_number,
                                supplier.email,
                                supplier.supplier_type,
                                supplier.payment_terms,
                                supplier.status

                            ]
                                .map(
                                    escapeCSV
                                )
                                .join(",")
                        );

                    }
                );


                const blob =
                    new Blob(
                        [
                            lines.join(
                                "\n"
                            )
                        ],
                        {
                            type:
                                "text/csv;charset=utf-8;"
                        }
                    );


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const link =
                    document.createElement(
                        "a"
                    );


                link.href =
                    url;


                link.download =
                    `suppliers_${getLocalDateString()}.csv`;


                document.body
                    .appendChild(
                        link
                    );


                link.click();


                document.body
                    .removeChild(
                        link
                    );


                URL.revokeObjectURL(
                    url
                );

            }
        );


    /* =========================================================
       INITIALIZE SUPPLIERS
    ========================================================= */

    async function initializeSuppliers() {

        hideSupplierForm();


        const results =
            await Promise.allSettled(
                [

                    loadSuppliers(),

                    getNextSupplierCode()

                ]
            );


        results.forEach(
            result => {

                if (
                    result.status ===
                    "rejected"
                ) {

                    console.error(
                        "SUPPLIER INITIALIZATION ERROR:",
                        result.reason
                    );

                }

            }
        );

    }


    initializeSuppliers();

}


/* =========================================================
   NEURA THEME SYSTEM
========================================================= */

function initThemeToggle() {

    const topbar =
        document.querySelector(
            ".topbar"
        );


    if (!topbar) {

        return;

    }


    const savedTheme =
        localStorage.getItem(
            "neura-theme"
        );


    if (
        savedTheme ===
        "night"
    ) {

        document.body
            .classList
            .add(
                "night-mode"
            );

    } else {

        document.body
            .classList
            .remove(
                "night-mode"
            );

    }


    const existingButton =
        document.querySelector(
            "#themeToggleBtn"
        );


    existingButton?.remove();


    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.id =
        "themeToggleBtn";


    button.className =
        "theme-toggle-btn";


    let transitionLayer =
        document.querySelector(
            ".neura-theme-transition"
        );


    if (!transitionLayer) {

        transitionLayer =
            document.createElement(
                "div"
            );


        transitionLayer.className =
            "neura-theme-transition";


        document.body
            .appendChild(
                transitionLayer
            );

    }


    function updateThemeButton() {

        const isNight =
            document.body
                .classList
                .contains(
                    "night-mode"
                );


        if (isNight) {

            button.innerHTML = `
                <span class="theme-toggle-orbit">

                    <span class="theme-sun">
                        ☀
                    </span>

                </span>

                <span class="theme-toggle-text">
                    Light
                </span>
            `;


            button.title =
                "Switch to Light Mode";


        } else {

            button.innerHTML = `
                <span class="theme-toggle-orbit">

                    <span class="theme-moon">
                        ☾
                    </span>

                </span>

                <span class="theme-toggle-text">
                    Night
                </span>
            `;


            button.title =
                "Switch to Night Mode";

        }

    }


    updateThemeButton();


    const adminProfile =
        topbar.querySelector(
            ".admin-profile"
        );


    let controls =
        topbar.querySelector(
            ".topbar-controls"
        );


    if (!controls) {

        controls =
            document.createElement(
                "div"
            );


        controls.className =
            "topbar-controls";


        if (adminProfile) {

            adminProfile
                .parentNode
                .insertBefore(
                    controls,
                    adminProfile
                );


            controls.appendChild(
                adminProfile
            );


        } else {

            topbar.appendChild(
                controls
            );

        }

    }


    if (adminProfile) {

        controls.insertBefore(
            button,
            adminProfile
        );


    } else {

        controls.appendChild(
            button
        );

    }


    button.addEventListener(
        "click",
        () => {

            if (
                document.body
                    .classList
                    .contains(
                        "theme-changing"
                    )
            ) {

                return;

            }


            const changeToNight =
                !document.body
                    .classList
                    .contains(
                        "night-mode"
                    );


            const buttonRect =
                button
                    .getBoundingClientRect();


            const originX =
                buttonRect.left +
                buttonRect.width / 2;


            const originY =
                buttonRect.top +
                buttonRect.height / 2;


            transitionLayer.style
                .setProperty(
                    "--theme-origin-x",
                    `${originX}px`
                );


            transitionLayer.style
                .setProperty(
                    "--theme-origin-y",
                    `${originY}px`
                );


            transitionLayer
                .classList
                .remove(
                    "to-night",
                    "to-light",
                    "is-running"
                );


            transitionLayer
                .classList
                .add(
                    changeToNight
                        ? "to-night"
                        : "to-light"
                );


            void transitionLayer
                .offsetWidth;


            document.body
                .classList
                .add(
                    "theme-changing"
                );


            transitionLayer
                .classList
                .add(
                    "is-running"
                );


            button.disabled =
                true;


            setTimeout(
                () => {

                    document.body
                        .classList
                        .toggle(
                            "night-mode",
                            changeToNight
                        );


                    localStorage.setItem(
                        "neura-theme",
                        changeToNight
                            ? "night"
                            : "light"
                    );


                    updateThemeButton();

                },
                330
            );


            setTimeout(
                () => {

                    transitionLayer
                        .classList
                        .remove(
                            "is-running",
                            "to-night",
                            "to-light"
                        );


                    document.body
                        .classList
                        .remove(
                            "theme-changing"
                        );


                    button.disabled =
                        false;

                },
                900
            );

        }
    );

}
/* =========================================================
   SALES JOURNAL
   CREATE BATCH FORM TOGGLE
   FILE: js/app.js
   PLACEMENT: PASTE AT THE VERY END
========================================================= */

function initSalesBatchFormToggle() {

    const showSalesBatchFormBtn =
        document.querySelector(
            "#showSalesBatchFormBtn"
        );

    const salesBatchFormPanel =
        document.querySelector(
            "#salesBatchFormPanel"
        );

    const cancelSalesBatchFormBtn =
        document.querySelector(
            "#cancelSalesBatchFormBtn"
        );

    const salesBatchCode =
        document.querySelector(
            "#salesBatchCode"
        );

    if (
        !showSalesBatchFormBtn ||
        !salesBatchFormPanel
    ) {
        return;
    }


    /* =====================================================
       HIDE FORM
    ===================================================== */

    function hideSalesBatchForm() {

        salesBatchFormPanel.hidden =
            true;

        salesBatchFormPanel.classList.add(
            "is-hidden"
        );

        showSalesBatchFormBtn.textContent =
            "+ Create Batch";

        showSalesBatchFormBtn.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    /* =====================================================
       SHOW FORM
    ===================================================== */

    function showSalesBatchForm() {

        salesBatchFormPanel.hidden =
            false;

        salesBatchFormPanel.classList.remove(
            "is-hidden"
        );

        showSalesBatchFormBtn.textContent =
            "Close Form";

        showSalesBatchFormBtn.setAttribute(
            "aria-expanded",
            "true"
        );


        setTimeout(
            () => {

                salesBatchCode?.focus();

            },
            150
        );


        salesBatchFormPanel.scrollIntoView({
            behavior:
                "smooth",

            block:
                "start"
        });

    }


    /* =====================================================
       DEFAULT
       HIDDEN WHEN PAGE OPENS
    ===================================================== */

    hideSalesBatchForm();


    /* =====================================================
       CREATE / CLOSE BUTTON
    ===================================================== */

    showSalesBatchFormBtn.addEventListener(
        "click",
        () => {

            if (
                salesBatchFormPanel.hidden ||
                salesBatchFormPanel.classList.contains(
                    "is-hidden"
                )
            ) {

                showSalesBatchForm();

            } else {

                hideSalesBatchForm();

            }

        }
    );


    /* =====================================================
       CANCEL BUTTON
    ===================================================== */

    if (
        cancelSalesBatchFormBtn
    ) {

        cancelSalesBatchFormBtn.addEventListener(
            "click",
            () => {

                hideSalesBatchForm();

            }
        );

    }

}


/* =========================================================
   INITIALIZE SALES BATCH TOGGLE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initSalesBatchFormToggle
);

/* =========================================================
   PURCHASE JOURNAL
   ENTRY FORM TOGGLE

   FILE:
   js/app.js

   PLACEMENT:
   PASTE AT THE VERY END
========================================================= */

function initPurchaseJournalFormToggle() {

    const showPurchaseJournalFormBtn =
        document.querySelector(
            "#showPurchaseJournalFormBtn"
        );

    const purchaseJournalFormPanel =
        document.querySelector(
            "#purchaseJournalFormPanel"
        );

    const purchaseBatch =
        document.querySelector(
            "#purchaseBatch"
        );


    if (
        !showPurchaseJournalFormBtn ||
        !purchaseJournalFormPanel
    ) {

        return;

    }


    /* =====================================================
       HIDE FORM
    ===================================================== */

    function hidePurchaseJournalForm() {

        purchaseJournalFormPanel.hidden =
            true;

        purchaseJournalFormPanel.classList.add(
            "is-hidden"
        );

        showPurchaseJournalFormBtn.textContent =
            "+ Create Journal Entry";

        showPurchaseJournalFormBtn.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    /* =====================================================
       SHOW FORM
    ===================================================== */

    function showPurchaseJournalForm() {

        purchaseJournalFormPanel.hidden =
            false;

        purchaseJournalFormPanel.classList.remove(
            "is-hidden"
        );

        showPurchaseJournalFormBtn.textContent =
            "Close Journal";

        showPurchaseJournalFormBtn.setAttribute(
            "aria-expanded",
            "true"
        );


        setTimeout(
            () => {

                purchaseBatch?.focus();

            },
            150
        );


        purchaseJournalFormPanel.scrollIntoView({
            behavior:
                "smooth",

            block:
                "start"
        });

    }


    /* =====================================================
       DEFAULT HIDDEN
    ===================================================== */

    hidePurchaseJournalForm();


    /* =====================================================
       OPEN / CLOSE BUTTON
    ===================================================== */

    showPurchaseJournalFormBtn.addEventListener(
        "click",
        () => {

            if (
                purchaseJournalFormPanel.hidden ||
                purchaseJournalFormPanel
                    .classList
                    .contains(
                        "is-hidden"
                    )
            ) {

                showPurchaseJournalForm();

            } else {

                hidePurchaseJournalForm();

            }

        }
    );

}


/* =========================================================
   INITIALIZE PURCHASE JOURNAL FORM TOGGLE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initPurchaseJournalFormToggle
);

/* =========================================================
   CUSTOMER
   CREATE FORM TOGGLE

   FILE:
   js/app.js

   PLACEMENT:
   PASTE AT THE VERY END
========================================================= */

function initCustomerFormToggle() {

    const toggleCustomerFormBtn =
        document.querySelector(
            "#toggleCustomerFormBtn"
        );

    const customerFormPanel =
        document.querySelector(
            "#customerFormPanel"
        );

    const cancelCustomerBtn =
        document.querySelector(
            "#cancelCustomerBtn"
        );

    const customerName =
        document.querySelector(
            "#customerName"
        );


    if (
        !toggleCustomerFormBtn ||
        !customerFormPanel
    ) {

        return;

    }


    /* =====================================================
       HIDE FORM
    ===================================================== */

    function hideCustomerForm() {

        customerFormPanel
            .classList
            .add(
                "is-hidden"
            );


        toggleCustomerFormBtn.textContent =
            "+ Create Customer";


        toggleCustomerFormBtn.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    /* =====================================================
       SHOW FORM
    ===================================================== */

    function showCustomerForm() {

        customerFormPanel
            .classList
            .remove(
                "is-hidden"
            );


        toggleCustomerFormBtn.textContent =
            "Close Form";


        toggleCustomerFormBtn.setAttribute(
            "aria-expanded",
            "true"
        );


        setTimeout(
            () => {

                customerName?.focus();

            },
            150
        );


        customerFormPanel.scrollIntoView({
            behavior:
                "smooth",

            block:
                "start"
        });

    }


    /* =====================================================
       DEFAULT HIDDEN
    ===================================================== */

    hideCustomerForm();


    /* =====================================================
       CREATE / CLOSE BUTTON
    ===================================================== */

    toggleCustomerFormBtn.addEventListener(
        "click",
        () => {

            if (
                customerFormPanel
                    .classList
                    .contains(
                        "is-hidden"
                    )
            ) {

                showCustomerForm();

            } else {

                hideCustomerForm();

            }

        }
    );


    /* =====================================================
       CANCEL BUTTON
    ===================================================== */

    if (
        cancelCustomerBtn
    ) {

        cancelCustomerBtn.addEventListener(
            "click",
            () => {

                hideCustomerForm();

            }
        );

    }

}


/* =========================================================
   INITIALIZE CUSTOMER FORM TOGGLE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initCustomerFormToggle
);

/* =========================================================
   CUSTOMER MODULE
   AUTO CODE + SAVE + LIST + SEARCH + DELETE

   FILE:
   js/app.js

   PLACEMENT:
   PASTE AT THE VERY END OF THE FILE
========================================================= */

function initCustomers() {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const customerForm =
        document.querySelector(
            "#customerForm"
        );

    const customerFormPanel =
        document.querySelector(
            "#customerFormPanel"
        );

    const toggleCustomerFormBtn =
        document.querySelector(
            "#toggleCustomerFormBtn"
        );

    const customerCode =
        document.querySelector(
            "#customerCode"
        );

    const customerName =
        document.querySelector(
            "#customerName"
        );

    const customerAddress =
        document.querySelector(
            "#customerAddress"
        );

    const customerTin =
        document.querySelector(
            "#customerTin"
        );

    const customerContactPerson =
        document.querySelector(
            "#customerContactPerson"
        );

    const customerContactNumber =
        document.querySelector(
            "#customerContactNumber"
        );

    const customerEmail =
        document.querySelector(
            "#customerEmail"
        );

    const customerType =
        document.querySelector(
            "#customerType"
        );

    const customerPaymentTerms =
        document.querySelector(
            "#customerPaymentTerms"
        );

    const customerStatus =
        document.querySelector(
            "#customerStatus"
        );

    const customerSearch =
        document.querySelector(
            "#customerSearch"
        );

    const customerTableBody =
        document.querySelector(
            "#customerTableBody"
        );


    /* =====================================================
       STOP IF NOT CUSTOMER PAGE
    ===================================================== */

    if (
        !customerForm ||
        !customerTableBody
    ) {

        return;

    }


    let customers = [];

    let editingCustomerId = null;

    const customerFormTitle =
        customerFormPanel?.querySelector(
            ".panel-header h2"
        );

    const customerFormDescription =
        customerFormPanel?.querySelector(
            ".panel-header p"
        );

    const saveCustomerBtn =
        document.querySelector(
            "#saveCustomerBtn"
        );

    const cancelCustomerBtn =
        document.querySelector(
            "#cancelCustomerBtn"
        );


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function customerEscapeHTML(value) {

        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );

    }


    /* =====================================================
       GET NEXT CUSTOMER CODE
    ===================================================== */

    async function getNextCustomerCode() {

        if (!customerCode) {
            return;
        }


        customerCode.value =
            "CUS-0001";


        try {

            const response =
                await fetch(
                    "/api/customers/next-code",
                    {
                        cache:
                            "no-store"
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to generate customer code."
                );

            }


            customerCode.value =
                data.customer_code ||
                "CUS-0001";


        } catch (error) {

            console.error(
                "NEXT CUSTOMER CODE ERROR:",
                error
            );

        }

    }


    /* =====================================================
       RESET FORM
    ===================================================== */

    function setCustomerCreateMode() {

        editingCustomerId =
            null;


        if (customerFormTitle) {

            customerFormTitle.textContent =
                "Create Customer";

        }


        if (customerFormDescription) {

            customerFormDescription.textContent =
                "Add customer information to NEURA.";

        }


        if (saveCustomerBtn) {

            saveCustomerBtn.textContent =
                "Save Customer";

        }

    }


    function resetCustomerForm() {

        customerForm.reset();


        if (customerPaymentTerms) {

            customerPaymentTerms.value =
                "Cash";

        }


        if (customerStatus) {

            customerStatus.value =
                "Active";

        }


        if (customerType) {

            customerType.value =
                "Regular";

        }


        setCustomerCreateMode();

    }


    /* =====================================================
       OPEN CUSTOMER IN EDIT MODE
    ===================================================== */

    function openCustomerEditForm(
        customer
    ) {

        editingCustomerId =
            Number(
                customer.customer_id
            );


        if (customerCode) {

            customerCode.value =
                customer.customer_code ||
                "";

        }


        if (customerName) {

            customerName.value =
                customer.customer_name ||
                "";

        }


        if (customerAddress) {

            customerAddress.value =
                customer.customer_address ||
                "";

        }


        if (customerTin) {

            customerTin.value =
                customer.tin_number ||
                "";

        }


        if (customerContactPerson) {

            customerContactPerson.value =
                customer.contact_person ||
                "";

        }


        if (customerContactNumber) {

            customerContactNumber.value =
                customer.contact_number ||
                "";

        }


        if (customerEmail) {

            customerEmail.value =
                customer.email ||
                "";

        }


        if (customerType) {

            customerType.value =
                customer.customer_type ||
                "Regular";

        }


        if (customerPaymentTerms) {

            customerPaymentTerms.value =
                customer.payment_terms ||
                "Cash";

        }


        if (customerStatus) {

            customerStatus.value =
                customer.status ||
                "Active";

        }


        if (customerFormTitle) {

            customerFormTitle.textContent =
                "Edit Customer";

        }


        if (customerFormDescription) {

            customerFormDescription.textContent =
                "Update customer information.";

        }


        if (saveCustomerBtn) {

            saveCustomerBtn.textContent =
                "Update Customer";

        }


        if (customerFormPanel) {

            customerFormPanel
                .classList
                .remove(
                    "is-hidden"
                );

        }


        if (toggleCustomerFormBtn) {

            toggleCustomerFormBtn.textContent =
                "Close Form";

            toggleCustomerFormBtn.setAttribute(
                "aria-expanded",
                "true"
            );

        }


        customerFormPanel
            ?.scrollIntoView({
                behavior:
                    "smooth",

                block:
                    "start"
            });


        setTimeout(
            () => {

                customerName
                    ?.focus();

            },
            150
        );

    }


    /* =====================================================
       HIDE FORM AFTER SAVE
    ===================================================== */

    function closeCustomerForm() {

        if (customerFormPanel) {

            customerFormPanel
                .classList
                .add(
                    "is-hidden"
                );

        }


        if (toggleCustomerFormBtn) {

            toggleCustomerFormBtn.textContent =
                "+ Create Customer";


            toggleCustomerFormBtn.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }


    /* =====================================================
       LOAD CUSTOMERS
    ===================================================== */

    async function loadCustomers() {

        customerTableBody.innerHTML = `
            <tr class="empty-row">

                <td colspan="9">
                    Loading customers...
                </td>

            </tr>
        `;


        try {

            const response =
                await fetch(
                    "/api/customers",
                    {
                        cache:
                            "no-store"
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to load customers."
                );

            }


            customers =
                data.customers || [];


            renderCustomers(
                customers
            );


        } catch (error) {

            console.error(
                "LOAD CUSTOMERS ERROR:",
                error
            );


            customerTableBody.innerHTML = `
                <tr class="empty-row">

                    <td colspan="9">
                        Unable to load customers.
                    </td>

                </tr>
            `;

        }

    }


    /* =====================================================
       RENDER CUSTOMER LIST
    ===================================================== */

    function renderCustomers(customerList) {

        if (!customerList.length) {

            customerTableBody.innerHTML = `
                <tr class="empty-row">

                    <td colspan="9">
                        No customers found.
                    </td>

                </tr>
            `;

            return;

        }


        customerTableBody.innerHTML =
            customerList
                .map(
                    customer => `
                        <tr>

                            <td class="supplier-code-cell">

                                ${customerEscapeHTML(
                        customer.customer_code
                    )}

                            </td>


                            <td>

                                <strong class="supplier-name-cell">

                                    ${customerEscapeHTML(
                        customer.customer_name
                    )}

                                </strong>

                            </td>


                            <td>

                                ${customerEscapeHTML(
                        customer.tin_number ||
                        "—"
                    )}

                            </td>


                            <td>

                                ${customerEscapeHTML(
                        customer.contact_person ||
                        "—"
                    )}

                            </td>


                            <td>

                                ${customerEscapeHTML(
                        customer.contact_number ||
                        "—"
                    )}

                            </td>


                            <td>

                                ${customerEscapeHTML(
                        customer.customer_type ||
                        "—"
                    )}

                            </td>


                            <td>

                                ${customerEscapeHTML(
                        customer.payment_terms ||
                        "—"
                    )}

                            </td>


                            <td>

                                <span
                                    class="
                                        supplier-status
                                        ${customer.status ===
                            "Active"
                            ? "is-active"
                            : "is-inactive"
                        }
                                    "
                                >

                                    ${customerEscapeHTML(
                            customer.status
                        )}

                                </span>

                            </td>


                           <td>

    <button
        type="button"
        class="secondary-btn customer-edit-btn"
        data-customer-id="${Number(
                            customer.customer_id
                        )
                        }"
    >
        Edit
    </button>


    <button
        type="button"
        class="supplier-delete-btn customer-delete-btn"
        data-customer-id="${Number(
                            customer.customer_id
                        )
                        }"
        data-customer-name="${customerEscapeHTML(
                            customer.customer_name
                        )
                        }"
    >
        Delete
    </button>

</td>

                        </tr>
                    `
                )
                .join("");

    }


    /* =====================================================
    SAVE / UPDATE CUSTOMER
 ===================================================== */

    customerForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const code =
                customerCode
                    ?.value
                    .trim()
                    .toUpperCase() ||
                "";


            const name =
                customerName
                    ?.value
                    .trim() ||
                "";


            if (
                !code ||
                !name
            ) {

                alert(
                    "Customer Code and Customer Name are required."
                );

                return;

            }


            const isEditing =
                Number.isInteger(
                    editingCustomerId
                ) &&
                editingCustomerId > 0;


            const submitButton =
                customerForm.querySelector(
                    'button[type="submit"]'
                );


            submitButton.disabled =
                true;


            submitButton.textContent =
                isEditing
                    ? "Updating..."
                    : "Saving...";


            const requestUrl =
                isEditing
                    ? `/api/customers/${editingCustomerId}`
                    : "/api/customers";


            const requestMethod =
                isEditing
                    ? "PUT"
                    : "POST";


            try {

                const response =
                    await fetch(
                        requestUrl,
                        {

                            method:
                                requestMethod,

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    customer_code:
                                        code,

                                    customer_name:
                                        name,

                                    customer_address:
                                        customerAddress
                                            ?.value
                                            .trim() ||
                                        "",

                                    tin_number:
                                        customerTin
                                            ?.value
                                            .trim() ||
                                        "",

                                    contact_person:
                                        customerContactPerson
                                            ?.value
                                            .trim() ||
                                        "",

                                    contact_number:
                                        customerContactNumber
                                            ?.value
                                            .trim() ||
                                        "",

                                    email:
                                        customerEmail
                                            ?.value
                                            .trim() ||
                                        "",

                                    customer_type:
                                        customerType
                                            ?.value ||
                                        "",

                                    payment_terms:
                                        customerPaymentTerms
                                            ?.value ||
                                        "Cash",

                                    status:
                                        customerStatus
                                            ?.value ||
                                        "Active"

                                })

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(

                        data.message ||

                        (
                            isEditing
                                ? "Unable to update customer."
                                : "Unable to create customer."
                        )

                    );

                }


                alert(

                    isEditing
                        ? `${code} - ${name} updated successfully.`
                        : `${code} - ${name} created successfully.`

                );


                resetCustomerForm();


                closeCustomerForm();


                await loadCustomers();


                await getNextCustomerCode();


            } catch (error) {

                console.error(

                    isEditing
                        ? "UPDATE CUSTOMER ERROR:"
                        : "CREATE CUSTOMER ERROR:",

                    error

                );


                alert(
                    error.message
                );


            } finally {

                submitButton.disabled =
                    false;


                submitButton.textContent =
                    editingCustomerId
                        ? "Update Customer"
                        : "Save Customer";

            }

        }
    );


    /* =====================================================
       SEARCH
    ===================================================== */

    if (customerSearch) {

        customerSearch.addEventListener(
            "input",
            () => {

                const searchValue =
                    customerSearch
                        .value
                        .trim()
                        .toLowerCase();


                if (!searchValue) {

                    renderCustomers(
                        customers
                    );

                    return;

                }


                const filteredCustomers =
                    customers.filter(
                        customer => {

                            const searchableText = [

                                customer.customer_code,
                                customer.customer_name,
                                customer.customer_address,
                                customer.tin_number,
                                customer.contact_person,
                                customer.contact_number,
                                customer.email,
                                customer.customer_type,
                                customer.payment_terms,
                                customer.status

                            ]
                                .join(" ")
                                .toLowerCase();


                            return searchableText
                                .includes(
                                    searchValue
                                );

                        }
                    );


                renderCustomers(
                    filteredCustomers
                );

            }
        );

    }

    /* =====================================================
   EDIT CUSTOMER
===================================================== */

    customerTableBody.addEventListener(
        "click",
        event => {

            const editButton =
                event.target.closest(
                    ".customer-edit-btn"
                );


            if (!editButton) {

                return;

            }


            const customerId =
                Number(
                    editButton.dataset
                        .customerId
                );


            if (
                !Number.isInteger(
                    customerId
                ) ||
                customerId <= 0
            ) {

                return;

            }


            const customer =
                customers.find(
                    item =>
                        Number(
                            item.customer_id
                        ) ===
                        customerId
                );


            if (!customer) {

                alert(
                    "Customer record not found."
                );

                return;

            }


            openCustomerEditForm(
                customer
            );

        }
    );


    /* =====================================================
       DELETE CUSTOMER
    ===================================================== */

    customerTableBody.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    ".customer-delete-btn"
                );


            if (!button) {

                return;

            }


            const customerId =
                Number(
                    button.dataset
                        .customerId
                );


            const customerDisplayName =
                button.dataset
                    .customerName ||
                "this customer";


            if (
                !Number.isInteger(
                    customerId
                ) ||
                customerId <= 0
            ) {

                return;

            }


            const confirmed =
                window.confirm(
                    `Delete ${customerDisplayName}?`
                );


            if (!confirmed) {

                return;

            }


            const originalText =
                button.textContent;


            button.disabled =
                true;


            button.textContent =
                "Deleting...";


            try {

                const response =
                    await fetch(
                        `/api/customers/${customerId}`,
                        {
                            method:
                                "DELETE"
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Unable to delete customer."
                    );

                }


                await loadCustomers();


                await getNextCustomerCode();


            } catch (error) {

                console.error(
                    "DELETE CUSTOMER ERROR:",
                    error
                );


                alert(
                    error.message
                );


                button.disabled =
                    false;


                button.textContent =
                    originalText;

            }

        }
    );


    /* =====================================================
    CREATE / CLOSE / CANCEL
    RESET EDIT MODE
 ===================================================== */

    if (toggleCustomerFormBtn) {

        toggleCustomerFormBtn.addEventListener(
            "click",
            () => {

                setTimeout(
                    async () => {

                        const formIsOpen =
                            toggleCustomerFormBtn
                                .getAttribute(
                                    "aria-expanded"
                                ) ===
                            "true";


                        resetCustomerForm();


                        if (formIsOpen) {

                            await getNextCustomerCode();

                        }

                    },
                    0
                );

            }
        );

    }


    if (cancelCustomerBtn) {

        cancelCustomerBtn.addEventListener(
            "click",
            () => {

                resetCustomerForm();

            }
        );

    }

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    loadCustomers();

    getNextCustomerCode();

}


/* =========================================================
   INITIALIZE CUSTOMER MODULE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initCustomers
);

/* =========================================================
   SALES JOURNAL
   LOAD CUSTOMERS FROM CUSTOMER MASTER

   FILE:
   js/app.js

   PLACEMENT:
   PASTE AT THE VERY END
========================================================= */

function initSalesJournalCustomers() {

    const salesCustomer =
        document.querySelector(
            "#salesCustomer"
        );


    if (!salesCustomer) {

        return;

    }


    async function loadSalesCustomers() {

        salesCustomer.innerHTML = `
            <option value="">
                Loading customers...
            </option>
        `;


        salesCustomer.disabled =
            true;


        try {

            const response =
                await fetch(
                    "/api/customers",
                    {
                        cache:
                            "no-store"
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to load customers."
                );

            }


            const customers =
                (
                    data.customers ||
                    []
                )
                    .filter(
                        customer =>
                            customer.status ===
                            "Active"
                    );


            salesCustomer.innerHTML = `
                <option value="">
                    Select Customer
                </option>

                ${customers
                    .map(
                        customer => `

                                <option
                                    value="${escapeSalesCustomerHTML(
                            customer.customer_name
                        )}"
                                >
                                    ${escapeSalesCustomerHTML(
                            customer.customer_code
                        )}
                                    -
                                    ${escapeSalesCustomerHTML(
                            customer.customer_name
                        )}
                                </option>

                            `
                    )
                    .join("")
                }
            `;


            salesCustomer.disabled =
                false;


        } catch (error) {

            console.error(
                "LOAD SALES CUSTOMERS ERROR:",
                error
            );


            salesCustomer.innerHTML = `
                <option value="">
                    Unable to load customers
                </option>
            `;


            salesCustomer.disabled =
                true;

        }

    }


    loadSalesCustomers();

}


/* =========================================================
   CUSTOMER OPTION ESCAPE
========================================================= */

function escapeSalesCustomerHTML(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initSalesJournalCustomers
);

/* =========================================================
   PURCHASE JOURNAL
   LOAD SUPPLIERS INTO PAYEE DROPDOWN

   FILE:
   js/app.js

   PLACEMENT:
   PASTE AT THE VERY END
========================================================= */

function initPurchaseJournalSuppliers() {

    const purchasePayee =
        document.querySelector(
            "#purchasePayee"
        );


    if (!purchasePayee) {

        return;

    }


    async function loadPurchaseSuppliers() {

        purchasePayee.innerHTML = `
            <option value="">
                Loading suppliers...
            </option>
        `;


        purchasePayee.disabled =
            true;


        try {

            const response =
                await fetch(
                    "/api/suppliers",
                    {
                        cache:
                            "no-store"
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to load suppliers."
                );

            }


            const suppliers =
                (
                    data.suppliers ||
                    []
                )
                    .filter(
                        supplier =>
                            supplier.status ===
                            "Active"
                    );


            if (!suppliers.length) {

                purchasePayee.innerHTML = `
                    <option value="">
                        No active suppliers
                    </option>
                `;

                purchasePayee.disabled =
                    true;

                return;

            }


            purchasePayee.innerHTML = `
                <option value="">
                    Select Supplier
                </option>

                ${suppliers
                    .map(
                        supplier => `

                                <option
                                    value="${escapePurchaseSupplierHTML(
                            supplier.supplier_name
                        )}"
                                >
                                    ${escapePurchaseSupplierHTML(
                            supplier.supplier_code
                        )}
                                    -
                                    ${escapePurchaseSupplierHTML(
                            supplier.supplier_name
                        )}
                                </option>

                            `
                    )
                    .join("")
                }
            `;


            purchasePayee.disabled =
                false;


        } catch (error) {

            console.error(
                "LOAD PURCHASE SUPPLIERS ERROR:",
                error
            );


            purchasePayee.innerHTML = `
                <option value="">
                    Unable to load suppliers
                </option>
            `;


            purchasePayee.disabled =
                true;

        }

    }


    loadPurchaseSuppliers();

}


/* =========================================================
   ESCAPE SUPPLIER TEXT
========================================================= */

function escapePurchaseSupplierHTML(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initPurchaseJournalSuppliers
);

/* =========================================================
   NEURA LIVE DASHBOARD
   FILE: js/app.js
   PLACEMENT: PASTE AT THE VERY END
========================================================= */

function initNEURALiveDashboard() {

    const totalSalesElement =
        document.querySelector(
            "#dashboardTotalSales"
        );

    const totalPurchasesElement =
        document.querySelector(
            "#dashboardTotalPurchases"
        );

    const customerCountElement =
        document.querySelector(
            "#dashboardCustomerCount"
        );

    const supplierCountElement =
        document.querySelector(
            "#dashboardSupplierCount"
        );

    const salesCountElement =
        document.querySelector(
            "#dashboardSalesCount"
        );

    const purchaseCountElement =
        document.querySelector(
            "#dashboardPurchaseCount"
        );

    const transactionTable =
        document.querySelector(
            "#transactionTable"
        );

    const refreshButton =
        document.querySelector(
            "#dashboardRefreshBtn"
        );


    /*
       This function only runs on index.html.
    */

    if (
        !totalSalesElement ||
        !totalPurchasesElement ||
        !customerCountElement ||
        !supplierCountElement ||
        !transactionTable
    ) {

        return;

    }


    function peso(value) {

        return new Intl.NumberFormat(
            "en-PH",
            {
                style:
                    "currency",

                currency:
                    "PHP",

                minimumFractionDigits:
                    2
            }
        )
            .format(
                Number(value) || 0
            );

    }


    function escapeHTML(value) {

        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );

    }


    function formatDashboardDate(value) {

        if (!value) {

            return "-";

        }


        const text =
            String(value);


        const datePart =
            text.includes("T")
                ? text.split("T")[0]
                : text;


        const parts =
            datePart.split("-");


        if (parts.length !== 3) {

            return datePart;

        }


        return `${parts[1]}/${parts[2]}/${parts[0]}`;

    }


    async function fetchDashboardData(
        url
    ) {

        const response =
            await fetch(
                url,
                {
                    cache:
                        "no-store"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                `Unable to load ${url}`
            );

        }


        return data;

    }


    function renderRecentTransactions(
        salesEntries,
        purchaseEntries
    ) {

        const salesTransactions =
            salesEntries.map(
                entry => ({
                    type:
                        "Sale",

                    date:
                        entry.entry_date || "",

                    reference:
                        entry.document_no || "",

                    account:
                        entry.credit_account_name ||
                        entry.credit_account_code ||
                        entry.customer_name ||
                        "Sales",

                    amount:
                        Number(
                            entry.credit_amount ??
                            entry.debit_amount
                        ) || 0
                })
            );


        const purchaseTransactions =
            purchaseEntries.map(
                entry => ({
                    type:
                        "Purchase",

                    date:
                        entry.entry_date || "",

                    reference:
                        entry.document_no || "",

                    account:
                        entry.debit_account_name ||
                        entry.debit_account_code ||
                        entry.payee ||
                        "Purchase",

                    amount:
                        Number(
                            entry.debit_amount ??
                            entry.credit_amount
                        ) || 0
                })
            );


        const transactions =
            [
                ...salesTransactions,
                ...purchaseTransactions
            ]
                .sort(
                    (a, b) =>
                        String(
                            b.date
                        )
                            .localeCompare(
                                String(
                                    a.date
                                )
                            )
                )
                .slice(
                    0,
                    8
                );


        if (!transactions.length) {

            transactionTable.innerHTML = `
                <tr class="empty-row">
                    <td colspan="5">
                        No transactions available.
                    </td>
                </tr>
            `;

            return;

        }


        transactionTable.innerHTML =
            transactions
                .map(
                    transaction => `

                        <tr>

                            <td>
                                ${escapeHTML(
                        formatDashboardDate(
                            transaction.date
                        )
                    )}
                            </td>

                            <td>
                                ${escapeHTML(
                        transaction.reference
                    )}
                            </td>

                            <td>
                                ${escapeHTML(
                        transaction.type
                    )}
                            </td>

                            <td>
                                ${escapeHTML(
                        transaction.account
                    )}
                            </td>

                            <td>
                                ${escapeHTML(
                        peso(
                            transaction.amount
                        )
                    )}
                            </td>

                        </tr>

                    `
                )
                .join("");

    }


    async function loadDashboard() {

        if (refreshButton) {

            refreshButton.disabled =
                true;

            refreshButton.textContent =
                "Loading...";

        }


        transactionTable.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                    Loading transactions...
                </td>
            </tr>
        `;


        try {

            const results =
                await Promise.allSettled(
                    [
                        fetchDashboardData(
                            "/api/sales-journal"
                        ),

                        fetchDashboardData(
                            "/api/purchase-journal"
                        ),

                        fetchDashboardData(
                            "/api/customers"
                        ),

                        fetchDashboardData(
                            "/api/suppliers"
                        )
                    ]
                );


            const salesData =
                results[0].status ===
                    "fulfilled"
                    ? results[0].value
                    : {
                        entries: []
                    };


            const purchaseData =
                results[1].status ===
                    "fulfilled"
                    ? results[1].value
                    : {
                        entries: []
                    };


            const customerData =
                results[2].status ===
                    "fulfilled"
                    ? results[2].value
                    : {
                        customers: []
                    };


            const supplierData =
                results[3].status ===
                    "fulfilled"
                    ? results[3].value
                    : {
                        suppliers: []
                    };


            const salesEntries =
                salesData.entries ||
                [];


            const purchaseEntries =
                purchaseData.entries ||
                [];


            const customers =
                customerData.customers ||
                [];


            const suppliers =
                supplierData.suppliers ||
                [];


            /*
               SALES TOTAL

               Every Sales Journal entry is balanced,
               so we use the Credit Amount as the
               transaction amount.
            */

            const totalSales =
                salesEntries.reduce(
                    (
                        total,
                        entry
                    ) => {

                        return total +
                            (
                                Number(
                                    entry.credit_amount
                                ) || 0
                            );

                    },
                    0
                );


            /*
               PURCHASE TOTAL

               Every Purchase Journal entry is balanced,
               so we use the Debit Amount as the
               transaction amount.
            */

            const totalPurchases =
                purchaseEntries
                    .filter(
                        entry =>
                            entry.status !==
                            "Cancelled"
                    )
                    .reduce(
                        (
                            total,
                            entry
                        ) => {

                            return total +
                                (
                                    Number(
                                        entry.debit_amount
                                    ) || 0
                                );

                        },
                        0
                    );


            totalSalesElement.textContent =
                peso(
                    totalSales
                );


            totalPurchasesElement.textContent =
                peso(
                    totalPurchases
                );


            customerCountElement.textContent =
                customers.length;


            supplierCountElement.textContent =
                suppliers.length;


            if (salesCountElement) {

                salesCountElement.textContent =
                    `${salesEntries.length} sales transaction${salesEntries.length === 1
                        ? ""
                        : "s"
                    }`;

            }


            if (purchaseCountElement) {

                const activePurchaseEntries =
                    purchaseEntries.filter(
                        entry =>
                            entry.status !==
                            "Cancelled"
                    );


                purchaseCountElement.textContent =
                    `${activePurchaseEntries.length} purchase transaction${activePurchaseEntries.length === 1
                        ? ""
                        : "s"
                    }`;

            }


            renderRecentTransactions(
                salesEntries,
                purchaseEntries
            );


            /*
               Show API errors in Console but allow
               the other dashboard sections to work.
            */

            results.forEach(
                (
                    result,
                    index
                ) => {

                    if (
                        result.status ===
                        "rejected"
                    ) {

                        const names = [
                            "Sales Journal",
                            "Purchase Journal",
                            "Customers",
                            "Suppliers"
                        ];


                        console.error(
                            `DASHBOARD ${names[index]} ERROR:`,
                            result.reason
                        );

                    }

                }
            );


        } catch (error) {

            console.error(
                "DASHBOARD LOAD ERROR:",
                error
            );


            transactionTable.innerHTML = `
                <tr class="empty-row">
                    <td colspan="5">
                        Unable to load dashboard data.
                    </td>
                </tr>
            `;

        } finally {

            if (refreshButton) {

                refreshButton.disabled =
                    false;

                refreshButton.textContent =
                    "Refresh";

            }

        }

    }


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadDashboard
        );

    }


    loadDashboard();

}


/* =========================================================
   INITIALIZE LIVE DASHBOARD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initNEURALiveDashboard
);

/* =========================================================
   PURCHASE JOURNAL
   CREATE BATCH FORM TOGGLE

   FILE:
   js/app.js

   PLACEMENT:
   PASTE AT THE VERY END OF THE FILE
========================================================= */

function initPurchaseBatchFormToggle() {

    const showBatchFormBtn =
        document.querySelector(
            "#showBatchFormBtn"
        );


    const batchFormPanel =
        document.querySelector(
            "#batchFormPanel"
        );


    const cancelBatchFormBtn =
        document.querySelector(
            "#cancelBatchFormBtn"
        );


    const batchCode =
        document.querySelector(
            "#batchCode"
        );


    /*
        Stop here when we are not
        on purchase-journal.html.
    */

    if (
        !showBatchFormBtn ||
        !batchFormPanel
    ) {

        return;

    }


    /* =====================================================
       HIDE BATCH FORM
    ===================================================== */

    function hidePurchaseBatchForm() {

        batchFormPanel.hidden =
            true;


        batchFormPanel.classList.add(
            "is-hidden"
        );


        showBatchFormBtn.textContent =
            "+ Create Batch";


        showBatchFormBtn.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    /* =====================================================
       SHOW BATCH FORM
    ===================================================== */

    function showPurchaseBatchForm() {

        batchFormPanel.hidden =
            false;


        batchFormPanel.classList.remove(
            "is-hidden"
        );


        showBatchFormBtn.textContent =
            "Close Form";


        showBatchFormBtn.setAttribute(
            "aria-expanded",
            "true"
        );


        setTimeout(
            () => {

                batchCode?.focus();

            },
            150
        );


        batchFormPanel.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    }


    /* =====================================================
       DEFAULT:
       HIDE FORM WHEN PAGE OPENS
    ===================================================== */

    hidePurchaseBatchForm();


    /* =====================================================
       CREATE BATCH / CLOSE FORM BUTTON
    ===================================================== */

    showBatchFormBtn.addEventListener(
        "click",
        () => {

            const isHidden =
                batchFormPanel.hidden ||
                batchFormPanel.classList.contains(
                    "is-hidden"
                );


            if (isHidden) {

                showPurchaseBatchForm();

            } else {

                hidePurchaseBatchForm();

            }

        }
    );


    /* =====================================================
       CANCEL BUTTON
    ===================================================== */

    if (cancelBatchFormBtn) {

        cancelBatchFormBtn.addEventListener(
            "click",
            () => {

                hidePurchaseBatchForm();

            }
        );

    }

}


/* =========================================================
   INITIALIZE PURCHASE BATCH TOGGLE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initPurchaseBatchFormToggle
);