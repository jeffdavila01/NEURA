/* =========================================================
   NEURA ACCOUNTING SYSTEM
   SALES JOURNAL SHEET

   FILE:
   js/sales-sheet.js

   BEHAVIOR:
   - Multiple editable journal rows
   - One active document only
   - 01-0001 stays active until successfully posted
   - Debit-only and Credit-only rows supported
   - Total Debit must equal Total Credit
   - Draft stays in browser until posted
   - Next document comes from MySQL only after successful POST
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /* =====================================================
           MAIN ELEMENTS
        ===================================================== */

        const salesBatch =
            document.querySelector(
                "#salesBatch"
            );

        const salesProceedBtn =
            document.querySelector(
                "#salesProceedBtn"
            );

        const salesSheetOverlay =
            document.querySelector(
                "#salesSheetOverlay"
            );

        const closeSalesSheetBtn =
            document.querySelector(
                "#closeSalesSheetBtn"
            );

        const cancelSalesSheetBtn =
            document.querySelector(
                "#cancelSalesSheetBtn"
            );

        const salesSheetActiveDocument =
            document.querySelector(
                "#salesSheetActiveDocument"
            );

        const salesSheetBatchName =
            document.querySelector(
                "#salesSheetBatchName"
            );

        const salesSheetStatus =
            document.querySelector(
                "#salesSheetStatus"
            );

        const salesAccountingBody =
            document.querySelector(
                "#salesAccountingBody"
            );

        const addSalesAccountingRowBtn =
            document.querySelector(
                "#addSalesAccountingRowBtn"
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

        const salesBalanceMessage =
            document.querySelector(
                "#salesBalanceMessage"
            );

        const checkSaveSalesBtn =
            document.querySelector(
                "#checkSaveSalesBtn"
            );

        const salesSheetPostBtn =
            document.querySelector(
                "#salesSheetPostBtn"
            );


        if (
            !salesBatch ||
            !salesProceedBtn ||
            !salesSheetOverlay ||
            !salesAccountingBody
        ) {
            return;
        }


        /* =====================================================
           STATE
        ===================================================== */

        const DEFAULT_ROW_COUNT = 8;

        let accounts = [];

        let customers = [];

        let referencesLoaded =
            false;

        let currentBatchId =
            null;

        let currentDocumentNo =
            "";

        let isCheckedAndSaved =
            false;


        /* =====================================================
           API HELPER
        ===================================================== */

        async function fetchJSON(
            url,
            options = {}
        ) {

            const response =
                await fetch(
                    url,
                    options
                );


            let data = {};

            try {

                data =
                    await response.json();

            } catch (error) {

                data = {};

            }


            if (
                !response.ok ||
                data.success === false
            ) {

                throw new Error(
                    data.message ||
                    `Request failed: ${response.status}`
                );

            }


            return data;

        }


        /* =====================================================
           HTML ESCAPE
        ===================================================== */

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


        /* =====================================================
           MONEY
        ===================================================== */

        function formatPeso(value) {

            return new Intl.NumberFormat(
                "en-PH",
                {
                    style: "currency",
                    currency: "PHP",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            ).format(
                Number(value) || 0
            );

        }


        /* =====================================================
           TODAY
        ===================================================== */

        function getToday() {

            const now =
                new Date();

            const year =
                now.getFullYear();

            const month =
                String(
                    now.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );

            const day =
                String(
                    now.getDate()
                ).padStart(
                    2,
                    "0"
                );

            return `${year}-${month}-${day}`;

        }


        /* =====================================================
           ACCOUNT OPTIONS
        ===================================================== */

        function getAccountOptions(
            selectedValue = ""
        ) {

            const selected =
                String(
                    selectedValue || ""
                );


            return `

                <option value="">
                    Select Account
                </option>

                ${
                    accounts
                        .map(
                            account => {

                                const value =
                                    String(
                                        account.account_id
                                    );

                                const isSelected =
                                    value ===
                                    selected;

                                return `

                                    <option
                                        value="${escapeHTML(value)}"
                                        ${isSelected ? "selected" : ""}
                                    >

                                        ${escapeHTML(account.account_code)}
                                        -
                                        ${escapeHTML(account.account_name)}

                                    </option>

                                `;

                            }
                        )
                        .join("")
                }

            `;

        }


        /* =====================================================
           CUSTOMER OPTIONS
        ===================================================== */

        function getCustomerOptions(
            selectedValue = ""
        ) {

            const selected =
                String(
                    selectedValue || ""
                );


            return `

                <option value="">
                    Select Payee
                </option>

                ${
                    customers
                        .filter(
                            customer =>
                                customer.status !==
                                "Inactive"
                        )
                        .map(
                            customer => {

                                const code =
                                    String(
                                        customer.customer_code ||
                                        ""
                                    );

                                const name =
                                    String(
                                        customer.customer_name ||
                                        ""
                                    );

                                return `

                                    <option
                                        value="${escapeHTML(code)}"
                                        ${code === selected ? "selected" : ""}
                                    >

                                        ${escapeHTML(code)}
                                        ${
                                            name
                                                ? ` - ${escapeHTML(name)}`
                                                : ""
                                        }

                                    </option>

                                `;

                            }
                        )
                        .join("")
                }

            `;

        }


        /* =====================================================
           LOAD CHART OF ACCOUNTS + CUSTOMERS
        ===================================================== */

        async function loadReferences() {

            if (referencesLoaded) {

                return;

            }


            const [
                accountData,
                customerData
            ] =
                await Promise.all(
                    [

                        fetchJSON(
                            "/api/accounts",
                            {
                                cache:
                                    "no-store"
                            }
                        ),

                        fetchJSON(
                            "/api/customers",
                            {
                                cache:
                                    "no-store"
                            }
                        )

                    ]
                );


            accounts =
                accountData.accounts ||
                [];

            customers =
                customerData.customers ||
                [];

            referencesLoaded =
                true;

        }


        /* =====================================================
           NEXT DOCUMENT
        ===================================================== */

        async function getNextDocument(
            batchId
        ) {

            const data =
                await fetchJSON(
                    `/api/sales-journal/next-document/${encodeURIComponent(batchId)}`,
                    {
                        cache:
                            "no-store"
                    }
                );


            return String(
                data.document_no ||
                ""
            );

        }


        /* =====================================================
           CREATE JOURNAL ROW
        ===================================================== */

        function createJournalRow(
            index,
            data = {}
        ) {

            const row =
                document.createElement(
                    "tr"
                );


            row.className =
                "sales-accounting-row journal-data-row";


            const isFirstRow =
                index === 0;


            const debitAccountId =
                data.debit_account_id ||
                "";

            const debitAmount =
                Number(
                    data.debit_amount
                ) || 0;

            const creditAccountId =
                data.credit_account_id ||
                "";

            const creditAmount =
                Number(
                    data.credit_amount
                ) || 0;

            const particulars =
                data.particulars ||
                "";

            const businessActivity =
                data.business_activity ||
                "";


            if (isFirstRow) {

                row.innerHTML = `

                    <td>

                        <input
                            type="date"
                            id="salesDate"
                            class="journal-cell-input journal-date-input"
                            value="${escapeHTML(data.entry_date || getToday())}"
                        >

                    </td>


                    <td>

                        <input
                            type="text"
                            id="salesDocumentNo"
                            class="journal-cell-input journal-doc-input"
                            value="${escapeHTML(currentDocumentNo)}"
                            readonly
                        >

                    </td>


                    <td>

                        <select
                            id="salesCustomer"
                            class="journal-cell-input journal-payee-input"
                        >

                            ${getCustomerOptions(data.customer || "")}

                        </select>

                    </td>


                    <td>

                        <select
                            class="sales-debit-account journal-cell-input"
                        >

                            ${getAccountOptions(debitAccountId)}

                        </select>

                    </td>


                    <td>

                        <input
                            type="number"
                            class="sales-debit-amount journal-cell-input journal-money-input"
                            min="0"
                            step="0.01"
                            value="${debitAmount > 0 ? debitAmount : ""}"
                        >

                    </td>


                    <td>

                        <select
                            class="sales-credit-account journal-cell-input"
                        >

                            ${getAccountOptions(creditAccountId)}

                        </select>

                    </td>


                    <td>

                        <input
                            type="number"
                            class="sales-credit-amount journal-cell-input journal-money-input"
                            min="0"
                            step="0.01"
                            value="${creditAmount > 0 ? creditAmount : ""}"
                        >

                    </td>


                    <td>

                        <input
                            type="text"
                            class="sales-particulars journal-cell-input"
                            value="${escapeHTML(particulars)}"
                        >

                    </td>


                    <td>

                        <input
                            type="text"
                            class="sales-business-activity journal-cell-input"
                            value="${escapeHTML(businessActivity)}"
                        >

                    </td>

                `;

            } else {

                row.innerHTML = `

                    <td>

                        <input
                            type="date"
                            class="journal-cell-input journal-row-date"
                            readonly
                        >

                    </td>


                    <td>

                        <input
                            type="text"
                            class="journal-cell-input journal-row-document"
                            readonly
                        >

                    </td>


                    <td>

                        <input
                            type="text"
                            class="journal-cell-input journal-row-payee"
                            readonly
                        >

                    </td>


                    <td>

                        <select
                            class="sales-debit-account journal-cell-input"
                        >

                            ${getAccountOptions(debitAccountId)}

                        </select>

                    </td>


                    <td>

                        <input
                            type="number"
                            class="sales-debit-amount journal-cell-input journal-money-input"
                            min="0"
                            step="0.01"
                            value="${debitAmount > 0 ? debitAmount : ""}"
                        >

                    </td>


                    <td>

                        <select
                            class="sales-credit-account journal-cell-input"
                        >

                            ${getAccountOptions(creditAccountId)}

                        </select>

                    </td>


                    <td>

                        <input
                            type="number"
                            class="sales-credit-amount journal-cell-input journal-money-input"
                            min="0"
                            step="0.01"
                            value="${creditAmount > 0 ? creditAmount : ""}"
                        >

                    </td>


                    <td>

                        <input
                            type="text"
                            class="sales-particulars journal-cell-input"
                            value="${escapeHTML(particulars)}"
                        >

                    </td>


                    <td>

                        <input
                            type="text"
                            class="sales-business-activity journal-cell-input"
                            value="${escapeHTML(businessActivity)}"
                        >

                    </td>

                `;

            }


            return row;

        }


        /* =====================================================
           SYNC DATE / DOCUMENT / PAYEE TO ALL ROWS
        ===================================================== */

        function syncHeaderRows() {

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


            const date =
                salesDate?.value ||
                "";

            const documentNo =
                salesDocumentNo?.value ||
                currentDocumentNo;

            const customerCode =
                salesCustomer?.value ||
                "";


            salesAccountingBody
                .querySelectorAll(
                    ".journal-row-date"
                )
                .forEach(
                    input => {

                        input.value =
                            date;

                    }
                );


            salesAccountingBody
                .querySelectorAll(
                    ".journal-row-document"
                )
                .forEach(
                    input => {

                        input.value =
                            documentNo;

                    }
                );


            salesAccountingBody
                .querySelectorAll(
                    ".journal-row-payee"
                )
                .forEach(
                    input => {

                        input.value =
                            customerCode;

                    }
                );

        }


        /* =====================================================
           GET ACCOUNTING ROWS
        ===================================================== */

        function getAccountingRows() {

            return Array.from(
                salesAccountingBody
                    .querySelectorAll(
                        ".sales-accounting-row"
                    )
            )
                .map(
                    row => {

                        const debitAccount =
                            row.querySelector(
                                ".sales-debit-account"
                            );

                        const debitAmount =
                            row.querySelector(
                                ".sales-debit-amount"
                            );

                        const creditAccount =
                            row.querySelector(
                                ".sales-credit-account"
                            );

                        const creditAmount =
                            row.querySelector(
                                ".sales-credit-amount"
                            );

                        const particulars =
                            row.querySelector(
                                ".sales-particulars"
                            );

                        const businessActivity =
                            row.querySelector(
                                ".sales-business-activity"
                            );


                        return {

                            debit_account_id:
                                debitAccount?.value ||
                                "",

                            debit_amount:
                                Number(
                                    debitAmount?.value
                                ) || 0,

                            credit_account_id:
                                creditAccount?.value ||
                                "",

                            credit_amount:
                                Number(
                                    creditAmount?.value
                                ) || 0,

                            particulars:
                                particulars?.value.trim() ||
                                "",

                            business_activity:
                                businessActivity?.value.trim() ||
                                ""

                        };

                    }
                );

        }


        /* =====================================================
           MEANINGFUL ROW
        ===================================================== */

        function isMeaningfulRow(row) {

            return Boolean(

                row.debit_account_id ||

                row.credit_account_id ||

                row.debit_amount !== 0 ||

                row.credit_amount !== 0 ||

                row.particulars ||

                row.business_activity

            );

        }


        /* =====================================================
           TOTALS
        ===================================================== */

        function calculateTotals() {

            const rows =
                getAccountingRows();


            const meaningfulRows =
                rows.filter(
                    isMeaningfulRow
                );


            const totalDebit =
                meaningfulRows.reduce(
                    (
                        total,
                        row
                    ) =>
                        total +
                        Number(
                            row.debit_amount
                        ),
                    0
                );


            const totalCredit =
                meaningfulRows.reduce(
                    (
                        total,
                        row
                    ) =>
                        total +
                        Number(
                            row.credit_amount
                        ),
                    0
                );


            const difference =
                Math.abs(
                    totalDebit -
                    totalCredit
                );


            return {

                rows:
                    meaningfulRows,

                totalDebit,

                totalCredit,

                difference

            };

        }


        /* =====================================================
           UPDATE TOTALS
        ===================================================== */

        function updateTotals() {

            const totals =
                calculateTotals();


            if (salesDebitTotal) {

                salesDebitTotal.textContent =
                    formatPeso(
                        totals.totalDebit
                    );

            }


            if (salesCreditTotal) {

                salesCreditTotal.textContent =
                    formatPeso(
                        totals.totalCredit
                    );

            }


            if (salesDifference) {

                salesDifference.textContent =
                    formatPeso(
                        totals.difference
                    );

            }


            if (
                totals.totalDebit === 0 &&
                totals.totalCredit === 0
            ) {

                if (salesBalanceMessage) {

                    salesBalanceMessage.textContent =
                        "Enter Debit and Credit amounts.";

                }

                return;

            }


            if (
                totals.totalDebit > 0 &&
                totals.totalCredit > 0 &&
                totals.difference < 0.005
            ) {

                if (salesBalanceMessage) {

                    salesBalanceMessage.textContent =
                        `${currentDocumentNo} is balanced. Click Check & Save.`;

                }

            } else {

                if (salesBalanceMessage) {

                    salesBalanceMessage.textContent =
                        `Difference must become ${formatPeso(0)}.`;

                }

            }

        }


        /* =====================================================
           DRAFT KEY
        ===================================================== */

        function getDraftKey() {

            if (
                !currentBatchId ||
                !currentDocumentNo
            ) {

                return null;

            }


            return (
                `neura-sales-draft-${currentBatchId}-${currentDocumentNo}`
            );

        }


        /* =====================================================
           SAVE LOCAL DRAFT
        ===================================================== */

        function saveDraft() {

            const key =
                getDraftKey();


            if (!key) {

                return;

            }


            const salesDate =
                document.querySelector(
                    "#salesDate"
                );

            const salesCustomer =
                document.querySelector(
                    "#salesCustomer"
                );


            const draft = {

                document_no:
                    currentDocumentNo,

                batch_id:
                    currentBatchId,

                entry_date:
                    salesDate?.value ||
                    "",

                customer:
                    salesCustomer?.value ||
                    "",

                lines:
                    getAccountingRows()

            };


            localStorage.setItem(
                key,
                JSON.stringify(
                    draft
                )
            );

        }


        /* =====================================================
           LOAD LOCAL DRAFT
        ===================================================== */

        function loadDraft() {

            const key =
                getDraftKey();


            if (!key) {

                return null;

            }


            const raw =
                localStorage.getItem(
                    key
                );


            if (!raw) {

                return null;

            }


            try {

                const draft =
                    JSON.parse(
                        raw
                    );


                if (
                    String(
                        draft.document_no ||
                        ""
                    ) !==
                    currentDocumentNo
                ) {

                    return null;

                }


                return draft;

            } catch (error) {

                return null;

            }

        }


        /* =====================================================
           DELETE LOCAL DRAFT
        ===================================================== */

        function deleteDraft() {

            const key =
                getDraftKey();


            if (key) {

                localStorage.removeItem(
                    key
                );

            }

        }


        /* =====================================================
           RESET VALIDATION
        ===================================================== */

        function markChanged() {

            isCheckedAndSaved =
                false;


            if (salesSheetPostBtn) {

                salesSheetPostBtn.disabled =
                    true;

            }


            if (salesSheetStatus) {

                salesSheetStatus.textContent =
                    "Changed - Check Again";

            }

        }


        /* =====================================================
           RENDER ROWS
        ===================================================== */

        function renderRows(
            draft = null
        ) {

            salesAccountingBody.innerHTML =
                "";


            const draftLines =
                Array.isArray(
                    draft?.lines
                )
                    ? draft.lines
                    : [];


            const rowCount =
                Math.max(
                    DEFAULT_ROW_COUNT,
                    draftLines.length
                );


            for (
                let index = 0;
                index < rowCount;
                index++
            ) {

                const data =
                    draftLines[index] ||
                    {};


                if (index === 0) {

                    data.entry_date =
                        draft?.entry_date ||
                        getToday();

                    data.customer =
                        draft?.customer ||
                        "";

                }


                salesAccountingBody
                    .appendChild(
                        createJournalRow(
                            index,
                            data
                        )
                    );

            }


            syncHeaderRows();

            updateTotals();

        }


        /* =====================================================
           VALIDATE HEADER
        ===================================================== */

        function validateHeader() {

            const salesDate =
                document.querySelector(
                    "#salesDate"
                );

            const salesCustomer =
                document.querySelector(
                    "#salesCustomer"
                );


            if (
                !salesDate?.value
            ) {

                alert(
                    "Please enter the Date."
                );

                salesDate?.focus();

                return false;

            }


            if (
                !salesCustomer?.value
            ) {

                alert(
                    "Please select a Payee / Customer."
                );

                salesCustomer?.focus();

                return false;

            }


            return true;

        }


        /* =====================================================
           VALIDATE JOURNAL ROWS
        ===================================================== */

        function validateAccounting() {

            const totals =
                calculateTotals();


            if (
                totals.rows.length === 0
            ) {

                alert(
                    "Please enter at least one journal row."
                );

                return false;

            }


            let hasDebit =
                false;

            let hasCredit =
                false;


            for (
                let index = 0;
                index < totals.rows.length;
                index++
            ) {

                const row =
                    totals.rows[index];


                if (
                    row.debit_amount < 0 ||
                    row.credit_amount < 0
                ) {

                    alert(
                        `Row ${index + 1}: Amount cannot be negative.`
                    );

                    return false;

                }


                if (
                    row.debit_amount > 0
                ) {

                    hasDebit =
                        true;


                    if (
                        !row.debit_account_id
                    ) {

                        alert(
                            `Row ${index + 1}: Select a Debit Account.`
                        );

                        return false;

                    }

                }


                if (
                    row.debit_account_id &&
                    row.debit_amount <= 0
                ) {

                    alert(
                        `Row ${index + 1}: Enter the Debit Amount.`
                    );

                    return false;

                }


                if (
                    row.credit_amount > 0
                ) {

                    hasCredit =
                        true;


                    if (
                        !row.credit_account_id
                    ) {

                        alert(
                            `Row ${index + 1}: Select a Credit Account.`
                        );

                        return false;

                    }

                }


                if (
                    row.credit_account_id &&
                    row.credit_amount <= 0
                ) {

                    alert(
                        `Row ${index + 1}: Enter the Credit Amount.`
                    );

                    return false;

                }


                if (
                    row.debit_amount <= 0 &&
                    row.credit_amount <= 0
                ) {

                    alert(
                        `Row ${index + 1}: Enter a Debit or Credit amount.`
                    );

                    return false;

                }


                if (
                    row.debit_account_id &&
                    row.credit_account_id &&
                    Number(
                        row.debit_account_id
                    ) ===
                    Number(
                        row.credit_account_id
                    )
                ) {

                    alert(
                        `Row ${index + 1}: Debit and Credit Account cannot be the same.`
                    );

                    return false;

                }

            }


            if (!hasDebit) {

                alert(
                    "Please enter at least one Debit entry."
                );

                return false;

            }


            if (!hasCredit) {

                alert(
                    "Please enter at least one Credit entry."
                );

                return false;

            }


            if (
                totals.totalDebit <= 0 ||
                totals.totalCredit <= 0
            ) {

                alert(
                    "Debit and Credit totals must be greater than zero."
                );

                return false;

            }


            if (
                totals.difference >=
                0.005
            ) {

                alert(
                    `Journal is not balanced.\n\nDifference: ${formatPeso(totals.difference)}`
                );

                return false;

            }


            return true;

        }


        /* =====================================================
           OPEN POPUP
        ===================================================== */

        async function openSalesSheet() {

            const selectedBatchId =
                Number(
                    salesBatch.value
                );


            if (
                !Number.isInteger(
                    selectedBatchId
                ) ||
                selectedBatchId <= 0
            ) {

                alert(
                    "Please select a Sales Batch first."
                );

                salesBatch.focus();

                return;

            }


            salesProceedBtn.disabled =
                true;


            try {

                await loadReferences();


                currentBatchId =
                    selectedBatchId;


                currentDocumentNo =
                    await getNextDocument(
                        currentBatchId
                    );


                if (
                    !currentDocumentNo
                ) {

                    throw new Error(
                        "Unable to generate document number."
                    );

                }


                const selectedOption =
                    salesBatch.options[
                        salesBatch.selectedIndex
                    ];


                if (
                    salesSheetBatchName
                ) {

                    salesSheetBatchName.textContent =
                        selectedOption
                            ?.textContent
                            .trim() ||
                        "Selected Batch";

                }


                if (
                    salesSheetActiveDocument
                ) {

                    salesSheetActiveDocument.textContent =
                        currentDocumentNo;

                }


                if (
                    salesSheetStatus
                ) {

                    salesSheetStatus.textContent =
                        "Open";

                }


                isCheckedAndSaved =
                    false;


                if (
                    salesSheetPostBtn
                ) {

                    salesSheetPostBtn.disabled =
                        true;

                }


                const draft =
                    loadDraft();


                renderRows(
                    draft
                );


                salesSheetOverlay.hidden =
                    false;


                document.body.classList.add(
                    "sales-sheet-open"
                );


                if (
                    draft &&
                    salesBalanceMessage
                ) {

                    salesBalanceMessage.textContent =
                        `Unfinished ${currentDocumentNo} restored.`;

                }


                setTimeout(
                    () => {

                        document
                            .querySelector(
                                "#salesCustomer"
                            )
                            ?.focus();

                    },
                    80
                );

            } catch (error) {

                console.error(
                    "OPEN SALES SHEET ERROR:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to open Sales Journal."
                );

            } finally {

                salesProceedBtn.disabled =
                    false;

            }

        }


        /* =====================================================
           CLOSE POPUP
        ===================================================== */

        function closeSalesSheet() {

            saveDraft();


            salesSheetOverlay.hidden =
                true;


            document.body.classList.remove(
                "sales-sheet-open"
            );

        }


        /* =====================================================
           ADD ROW
        ===================================================== */

        function addJournalRow() {

            const currentRows =
                salesAccountingBody
                    .querySelectorAll(
                        ".sales-accounting-row"
                    )
                    .length;


            const row =
                createJournalRow(
                    currentRows,
                    {}
                );


            salesAccountingBody
                .appendChild(
                    row
                );


            syncHeaderRows();

            markChanged();

            saveDraft();


            row.querySelector(
                ".sales-debit-account"
            )?.focus();

        }


        /* =====================================================
           JOURNAL CHANGED
        ===================================================== */

        function journalChanged(
            event
        ) {

            if (
                event.target.id ===
                    "salesDate" ||
                event.target.id ===
                    "salesCustomer"
            ) {

                syncHeaderRows();

            }


            updateTotals();

            markChanged();

            saveDraft();

        }


        /* =====================================================
           CHECK & SAVE
        ===================================================== */

        function checkAndSave() {

            if (
                !validateHeader()
            ) {

                return;

            }


            if (
                !validateAccounting()
            ) {

                return;

            }


            saveDraft();


            isCheckedAndSaved =
                true;


            if (
                salesSheetStatus
            ) {

                salesSheetStatus.textContent =
                    "Saved / Ready to Post";

            }


            if (
                salesBalanceMessage
            ) {

                salesBalanceMessage.textContent =
                    `${currentDocumentNo} is balanced and ready to post.`;

            }


            if (
                salesSheetPostBtn
            ) {

                salesSheetPostBtn.disabled =
                    false;

            }


            alert(
                `${currentDocumentNo} checked successfully.\n\nDebit and Credit are balanced.`
            );

        }


        /* =====================================================
           POST TO MYSQL
        ===================================================== */

        async function postEntry() {

            if (
                !isCheckedAndSaved
            ) {

                alert(
                    "Please click Check & Save first."
                );

                return;

            }


            if (
                !validateHeader() ||
                !validateAccounting()
            ) {

                isCheckedAndSaved =
                    false;

                salesSheetPostBtn.disabled =
                    true;

                return;

            }


            const totals =
                calculateTotals();


            const salesDate =
                document.querySelector(
                    "#salesDate"
                );

            const salesCustomer =
                document.querySelector(
                    "#salesCustomer"
                );


            const payload = {

                batch_id:
                    currentBatchId,

                entry_date:
                    salesDate.value,

                document_no:
                    currentDocumentNo,

                customer_name:
                    salesCustomer.value,

                lines:
                    totals.rows.map(
                        row => ({

                            debit_account_id:
                                row.debit_account_id
                                    ? Number(
                                        row.debit_account_id
                                    )
                                    : null,

                            debit_amount:
                                Number(
                                    row.debit_amount
                                ) || 0,

                            credit_account_id:
                                row.credit_account_id
                                    ? Number(
                                        row.credit_account_id
                                    )
                                    : null,

                            credit_amount:
                                Number(
                                    row.credit_amount
                                ) || 0,

                            particulars:
                                row.particulars,

                            business_activity:
                                row.business_activity

                        })
                    )

            };


            const originalText =
                salesSheetPostBtn.textContent;


            salesSheetPostBtn.disabled =
                true;

            salesSheetPostBtn.textContent =
                "Posting...";


            try {

                const result =
                    await fetchJSON(
                        "/api/sales-journal",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );


                deleteDraft();


                alert(
                    `${currentDocumentNo} posted successfully.\n\nNext document: ${result.next_document || "Generated after reload"}`
                );


                salesSheetOverlay.hidden =
                    true;


                document.body.classList.remove(
                    "sales-sheet-open"
                );


                /*
                 * Reload so:
                 * - history updates
                 * - the next Proceed request comes from MySQL
                 * - 01-0002 appears only AFTER 01-0001 is posted
                 */

                window.location.reload();

            } catch (error) {

                console.error(
                    "POST SALES JOURNAL ERROR:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to post Sales Journal."
                );


                salesSheetPostBtn.disabled =
                    false;

                salesSheetPostBtn.textContent =
                    originalText;

            }

        }


        /* =====================================================
           EVENTS
        ===================================================== */

        salesProceedBtn.addEventListener(
            "click",
            openSalesSheet
        );


        closeSalesSheetBtn
            ?.addEventListener(
                "click",
                closeSalesSheet
            );


        cancelSalesSheetBtn
            ?.addEventListener(
                "click",
                closeSalesSheet
            );


        addSalesAccountingRowBtn
            ?.addEventListener(
                "click",
                addJournalRow
            );


        salesAccountingBody
            .addEventListener(
                "input",
                journalChanged
            );


        salesAccountingBody
            .addEventListener(
                "change",
                journalChanged
            );


        checkSaveSalesBtn
            ?.addEventListener(
                "click",
                checkAndSave
            );


        salesSheetPostBtn
            ?.addEventListener(
                "click",
                postEntry
            );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                        "Escape" &&
                    !salesSheetOverlay.hidden
                ) {

                    closeSalesSheet();

                }

            }
        );


        salesSheetOverlay.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    salesSheetOverlay
                ) {

                    closeSalesSheet();

                }

            }
        );


        /* =====================================================
           INITIAL
        ===================================================== */

        if (
            salesSheetPostBtn
        ) {

            salesSheetPostBtn.disabled =
                true;

        }

    }
);