/* =========================================================
   NEURA ACCOUNTING SYSTEM
   SALES JOURNAL SHEET

   FILE:
   js/sales-sheet.js

   ACTION:
   REPLACE ENTIRE FILE

   CURRENT RULE:
   - Select Batch
   - Click Proceed
   - Open Sales Journal popup
   - One active document only: 01-0001
   - Add Products
   - Add Debit / Credit rows
   - Difference must be 0
   - Check & Save
   - Post Entry enabled after validation

   NOTE:
   Actual multi-line MySQL posting will be connected next.
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


        /* =====================================================
           DOCUMENT INFORMATION
        ===================================================== */

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

        const salesPaymentMethod =
            document.querySelector(
                "#salesPaymentMethod"
            );


        /* =====================================================
           PRODUCTS
        ===================================================== */

        const salesItemsBody =
            document.querySelector(
                "#salesItemsBody"
            );

        const addSalesItemBtn =
            document.querySelector(
                "#addSalesItemBtn"
            );

        const salesItemsGrandTotal =
            document.querySelector(
                "#salesItemsGrandTotal"
            );


        /* =====================================================
           ACCOUNTING
        ===================================================== */

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


        /* =====================================================
           ACTION BUTTONS
        ===================================================== */

        const checkSaveSalesBtn =
            document.querySelector(
                "#checkSaveSalesBtn"
            );

        const salesSheetPostBtn =
            document.querySelector(
                "#salesSheetPostBtn"
            );


        /* =====================================================
           STOP ONLY IF THIS IS NOT SALES JOURNAL PAGE
        ===================================================== */

        if (
            !salesBatch ||
            !salesProceedBtn ||
            !salesSheetOverlay
        ) {

            return;

        }


        /* =====================================================
           ACTIVE DOCUMENT

           IMPORTANT:
           01-0001 remains active.

           DO NOT generate 01-0002 until
           successful real database posting.
        ===================================================== */

        const ACTIVE_DOCUMENT =
            "01-0001";


        let isCheckedAndSaved =
            false;


        /* =====================================================
           FORMAT PESO
        ===================================================== */

        function formatPeso(value) {

            return new Intl.NumberFormat(
                "en-PH",
                {
                    style:
                        "currency",

                    currency:
                        "PHP",

                    minimumFractionDigits:
                        2,

                    maximumFractionDigits:
                        2
                }
            ).format(
                Number(value) || 0
            );

        }


        /* =====================================================
           GET TODAY
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

            return (
                `${year}-${month}-${day}`
            );

        }


        /* =====================================================
           RESET SAVED STATUS WHEN USER CHANGES SOMETHING
        ===================================================== */

        function markChanged() {

            if (!isCheckedAndSaved) {

                return;

            }

            isCheckedAndSaved =
                false;

            if (salesSheetPostBtn) {

                salesSheetPostBtn.disabled =
                    true;

            }

            if (salesSheetStatus) {

                salesSheetStatus.textContent =
                    "Changed - Check Again";

                salesSheetStatus.className =
                    "is-warning";

            }

        }


        /* =====================================================
           GET FIRST ACCOUNT OPTIONS

           app.js loads Chart of Accounts
           into these first dropdowns.
        ===================================================== */

        function getDebitAccountOptions() {

            const firstSelect =
                document.querySelector(
                    "#salesDebitAccount"
                );

            return (
                firstSelect?.innerHTML ||
                `
                    <option value="">
                        Select Account
                    </option>
                `
            );

        }


        function getCreditAccountOptions() {

            const firstSelect =
                document.querySelector(
                    "#salesCreditAccount"
                );

            return (
                firstSelect?.innerHTML ||
                `
                    <option value="">
                        Select Account
                    </option>
                `
            );

        }


        /* =====================================================
           CREATE PRODUCT ROW
        ===================================================== */

        function createProductRow() {

            const row =
                document.createElement(
                    "tr"
                );

            row.className =
                "sales-item-row";

            row.innerHTML = `
                <td>
                    <input
                        type="text"
                        class="sales-item-name"
                        placeholder="Product or service"
                    >
                </td>

                <td>
                    <input
                        type="number"
                        class="sales-item-qty"
                        min="0"
                        step="0.01"
                        placeholder="0"
                    >
                </td>

                <td>
                    <input
                        type="number"
                        class="sales-item-price"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                    >
                </td>

                <td>
                    <input
                        type="text"
                        class="sales-item-total"
                        value="₱0.00"
                        readonly
                    >
                </td>

                <td>
                    <button
                        type="button"
                        class="sales-remove-row-btn"
                        title="Remove item"
                    >
                        ×
                    </button>
                </td>
            `;

            return row;

        }


        /* =====================================================
           CALCULATE PRODUCT TOTAL
        ===================================================== */

        function updateProductTotals() {

            if (
                !salesItemsBody ||
                !salesItemsGrandTotal
            ) {

                return;

            }

            const rows =
                Array.from(
                    salesItemsBody.querySelectorAll(
                        ".sales-item-row"
                    )
                );

            let grandTotal =
                0;

            rows.forEach(
                row => {

                    const quantity =
                        Number(
                            row.querySelector(
                                ".sales-item-qty"
                            )?.value
                        ) || 0;

                    const unitPrice =
                        Number(
                            row.querySelector(
                                ".sales-item-price"
                            )?.value
                        ) || 0;

                    const total =
                        quantity *
                        unitPrice;

                    grandTotal +=
                        total;

                    const totalInput =
                        row.querySelector(
                            ".sales-item-total"
                        );

                    if (totalInput) {

                        totalInput.value =
                            formatPeso(
                                total
                            );

                    }

                }
            );

            salesItemsGrandTotal.textContent =
                formatPeso(
                    grandTotal
                );

            markChanged();

        }


        /* =====================================================
           CREATE ACCOUNTING ROW
        ===================================================== */

        function createAccountingRow() {

            const row =
                document.createElement(
                    "tr"
                );

            row.className =
                "sales-accounting-row";

            row.innerHTML = `
                <td>
                    <select
                        class="sales-debit-account"
                    >
                        ${getDebitAccountOptions()}
                    </select>
                </td>

                <td>
                    <input
                        type="number"
                        class="sales-debit-amount"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                    >
                </td>

                <td>
                    <select
                        class="sales-credit-account"
                    >
                        ${getCreditAccountOptions()}
                    </select>
                </td>

                <td>
                    <input
                        type="number"
                        class="sales-credit-amount"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                    >
                </td>

                <td>
                    <input
                        type="text"
                        class="sales-particulars"
                        placeholder="Description"
                    >
                </td>

                <td>
                    <input
                        type="text"
                        class="sales-business-activity"
                        placeholder="Business Activity"
                    >
                </td>

                <td>
                    <button
                        type="button"
                        class="sales-remove-row-btn"
                        title="Remove row"
                    >
                        ×
                    </button>
                </td>
            `;

            return row;

        }


        /* =====================================================
           GET PRODUCT DATA
        ===================================================== */

        function getProductRows() {

            if (!salesItemsBody) {

                return [];

            }

            return Array.from(
                salesItemsBody.querySelectorAll(
                    ".sales-item-row"
                )
            ).map(
                row => {

                    const itemName =
                        row.querySelector(
                            ".sales-item-name"
                        )?.value.trim() ||
                        "";

                    const quantity =
                        Number(
                            row.querySelector(
                                ".sales-item-qty"
                            )?.value
                        ) || 0;

                    const unitPrice =
                        Number(
                            row.querySelector(
                                ".sales-item-price"
                            )?.value
                        ) || 0;

                    return {

                        item_name:
                            itemName,

                        quantity,

                        unit_price:
                            unitPrice,

                        total:
                            quantity *
                            unitPrice

                    };

                }
            );

        }


        /* =====================================================
           GET ACCOUNTING DATA
        ===================================================== */

        function getAccountingRows() {

            if (!salesAccountingBody) {

                return [];

            }

            return Array.from(
                salesAccountingBody.querySelectorAll(
                    ".sales-accounting-row"
                )
            ).map(
                row => {

                    return {

                        debit_account_id:
                            row.querySelector(
                                ".sales-debit-account"
                            )?.value ||
                            "",

                        debit_amount:
                            Number(
                                row.querySelector(
                                    ".sales-debit-amount"
                                )?.value
                            ) || 0,

                        credit_account_id:
                            row.querySelector(
                                ".sales-credit-account"
                            )?.value ||
                            "",

                        credit_amount:
                            Number(
                                row.querySelector(
                                    ".sales-credit-amount"
                                )?.value
                            ) || 0,

                        particulars:
                            row.querySelector(
                                ".sales-particulars"
                            )?.value.trim() ||
                            "",

                        business_activity:
                            row.querySelector(
                                ".sales-business-activity"
                            )?.value.trim() ||
                            ""

                    };

                }
            );

        }


        /* =====================================================
           CALCULATE ACCOUNTING TOTALS
        ===================================================== */

        function calculateAccountingTotals() {

            const rows =
                getAccountingRows();

            const totalDebit =
                rows.reduce(
                    (
                        total,
                        row
                    ) =>
                        total +
                        row.debit_amount,
                    0
                );

            const totalCredit =
                rows.reduce(
                    (
                        total,
                        row
                    ) =>
                        total +
                        row.credit_amount,
                    0
                );

            const difference =
                Math.abs(
                    totalDebit -
                    totalCredit
                );

            return {

                rows,

                totalDebit,

                totalCredit,

                difference

            };

        }


        /* =====================================================
           UPDATE ACCOUNTING TOTALS
        ===================================================== */

        function updateAccountingTotals() {

            const totals =
                calculateAccountingTotals();

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

                if (salesSheetStatus) {

                    salesSheetStatus.textContent =
                        "Open";

                    salesSheetStatus.className =
                        "";

                }

                markChanged();

                return;

            }


            if (
                totals.totalDebit >
                0 &&
                totals.totalCredit >
                0 &&
                totals.difference <
                0.005
            ) {

                if (salesBalanceMessage) {

                    salesBalanceMessage.textContent =
                        "Debit and Credit are balanced. Click Check & Save.";

                }

                if (salesSheetStatus) {

                    salesSheetStatus.textContent =
                        "Balanced - Not Saved";

                    salesSheetStatus.className =
                        "is-balanced";

                }

            } else {

                if (salesBalanceMessage) {

                    salesBalanceMessage.textContent =
                        `Difference must become ${formatPeso(0)}.`;

                }

                if (salesSheetStatus) {

                    salesSheetStatus.textContent =
                        "Not Balanced";

                    salesSheetStatus.className =
                        "is-unbalanced";

                }

            }

            markChanged();

        }


        /* =====================================================
           VALIDATE SALES INFORMATION
        ===================================================== */

        function validateSalesInformation() {

            if (
                !salesDate?.value
            ) {

                alert(
                    "Please enter the sales date."
                );

                salesDate?.focus();

                return false;

            }


            if (
                !salesCustomer?.value
            ) {

                alert(
                    "Please select a Customer."
                );

                salesCustomer?.focus();

                return false;

            }


            if (
                !salesPaymentMethod?.value
            ) {

                alert(
                    "Please select a Payment Method."
                );

                salesPaymentMethod?.focus();

                return false;

            }


            const products =
                getProductRows();


            const validProducts =
                products.filter(
                    product => {

                        return (
                            product.item_name &&
                            product.quantity >
                            0 &&
                            product.unit_price >
                            0
                        );

                    }
                );


            if (
                validProducts.length ===
                0
            ) {

                alert(
                    "Please enter at least one Item / Product sold."
                );

                return false;

            }


            return true;

        }


        /* =====================================================
           VALIDATE ACCOUNTING ROWS
        ===================================================== */

        function validateAccounting() {

            const totals =
                calculateAccountingTotals();


            let hasDebit =
                false;

            let hasCredit =
                false;


            for (
                let index = 0;
                index <
                totals.rows.length;
                index++
            ) {

                const row =
                    totals.rows[index];


                if (
                    row.debit_amount >
                    0
                ) {

                    hasDebit =
                        true;

                    if (
                        !row.debit_account_id
                    ) {

                        alert(
                            `Accounting Row ${index + 1}: Select a Debit Account.`
                        );

                        return false;

                    }

                }


                if (
                    row.debit_account_id &&
                    row.debit_amount <=
                    0
                ) {

                    alert(
                        `Accounting Row ${index + 1}: Enter a Debit Amount.`
                    );

                    return false;

                }


                if (
                    row.credit_amount >
                    0
                ) {

                    hasCredit =
                        true;

                    if (
                        !row.credit_account_id
                    ) {

                        alert(
                            `Accounting Row ${index + 1}: Select a Credit Account.`
                        );

                        return false;

                    }

                }


                if (
                    row.credit_account_id &&
                    row.credit_amount <=
                    0
                ) {

                    alert(
                        `Accounting Row ${index + 1}: Enter a Credit Amount.`
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
           OPEN SALES SHEET
        ===================================================== */

        function openSalesSheet() {

            const selectedBatchId =
                salesBatch
                    .value
                    .trim();


            if (!selectedBatchId) {

                alert(
                    "Please select a Sales Batch first."
                );

                salesBatch.focus();

                return;

            }


            const selectedOption =
                salesBatch.options[
                    salesBatch.selectedIndex
                ];


            if (salesSheetBatchName) {

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
                    ACTIVE_DOCUMENT;

            }


            if (
                salesDocumentNo
            ) {

                salesDocumentNo.value =
                    ACTIVE_DOCUMENT;

                salesDocumentNo.readOnly =
                    true;

            }


            if (
                salesDate &&
                !salesDate.value
            ) {

                salesDate.value =
                    getToday();

            }


            if (salesSheetStatus) {

                salesSheetStatus.textContent =
                    "Open";

                salesSheetStatus.className =
                    "";

            }


            isCheckedAndSaved =
                false;


            if (salesSheetPostBtn) {

                salesSheetPostBtn.disabled =
                    true;

            }


            salesSheetOverlay.hidden =
                false;


            document.body.classList.add(
                "sales-sheet-open"
            );


            updateProductTotals();

            updateAccountingTotals();


            setTimeout(
                () => {

                    salesCustomer?.focus();

                },
                100
            );

        }


        /* =====================================================
           CLOSE SALES SHEET
        ===================================================== */

        function closeSalesSheet() {

            salesSheetOverlay.hidden =
                true;


            document.body.classList.remove(
                "sales-sheet-open"
            );

        }


        /* =====================================================
           PROCEED BUTTON
        ===================================================== */

        salesProceedBtn.addEventListener(
            "click",
            openSalesSheet
        );


        /* =====================================================
           CLOSE BUTTON
        ===================================================== */

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


        /* =====================================================
           ADD ITEM
        ===================================================== */

        addSalesItemBtn
            ?.addEventListener(
                "click",
                () => {

                    if (!salesItemsBody) {

                        return;

                    }

                    const row =
                        createProductRow();


                    salesItemsBody.appendChild(
                        row
                    );


                    markChanged();


                    row.querySelector(
                        ".sales-item-name"
                    )?.focus();

                }
            );


        /* =====================================================
           PRODUCT INPUT EVENTS
        ===================================================== */

        salesItemsBody
            ?.addEventListener(
                "input",
                updateProductTotals
            );


        /* =====================================================
           REMOVE PRODUCT ROW
        ===================================================== */

        salesItemsBody
            ?.addEventListener(
                "click",
                event => {

                    const removeButton =
                        event.target.closest(
                            ".sales-remove-row-btn"
                        );


                    if (!removeButton) {

                        return;

                    }


                    const row =
                        removeButton.closest(
                            ".sales-item-row"
                        );


                    if (!row) {

                        return;

                    }


                    const rows =
                        salesItemsBody.querySelectorAll(
                            ".sales-item-row"
                        );


                    if (
                        rows.length <=
                        1
                    ) {

                        return;

                    }


                    row.remove();


                    updateProductTotals();

                }
            );


        /* =====================================================
           ADD ACCOUNTING ROW
        ===================================================== */

        addSalesAccountingRowBtn
            ?.addEventListener(
                "click",
                () => {

                    if (!salesAccountingBody) {

                        return;

                    }


                    const row =
                        createAccountingRow();


                    salesAccountingBody.appendChild(
                        row
                    );


                    markChanged();


                    row.querySelector(
                        ".sales-debit-account"
                    )?.focus();

                }
            );


        /* =====================================================
           ACCOUNTING EVENTS
        ===================================================== */

        salesAccountingBody
            ?.addEventListener(
                "input",
                updateAccountingTotals
            );


        salesAccountingBody
            ?.addEventListener(
                "change",
                updateAccountingTotals
            );


        /* =====================================================
           REMOVE ACCOUNTING ROW
        ===================================================== */

        salesAccountingBody
            ?.addEventListener(
                "click",
                event => {

                    const removeButton =
                        event.target.closest(
                            ".sales-remove-row-btn"
                        );


                    if (!removeButton) {

                        return;

                    }


                    const row =
                        removeButton.closest(
                            ".sales-accounting-row"
                        );


                    if (!row) {

                        return;

                    }


                    const rows =
                        salesAccountingBody
                            .querySelectorAll(
                                ".sales-accounting-row"
                            );


                    if (
                        rows.length <=
                        1
                    ) {

                        return;

                    }


                    row.remove();


                    updateAccountingTotals();

                }
            );


        /* =====================================================
           CUSTOMER / PAYMENT / DATE CHANGES
        ===================================================== */

        salesCustomer
            ?.addEventListener(
                "change",
                markChanged
            );


        salesPaymentMethod
            ?.addEventListener(
                "change",
                markChanged
            );


        salesDate
            ?.addEventListener(
                "change",
                markChanged
            );


        /* =====================================================
           CHECK & SAVE

           PREVIEW / VALIDATION ONLY FOR NOW
        ===================================================== */

        checkSaveSalesBtn
            ?.addEventListener(
                "click",
                () => {

                    if (
                        !validateSalesInformation()
                    ) {

                        return;

                    }


                    if (
                        !validateAccounting()
                    ) {

                        return;

                    }


                    isCheckedAndSaved =
                        true;


                    if (salesSheetStatus) {

                        salesSheetStatus.textContent =
                            "Saved / Ready to Post";

                        salesSheetStatus.className =
                            "is-saved";

                    }


                    if (salesBalanceMessage) {

                        salesBalanceMessage.textContent =
                            `${ACTIVE_DOCUMENT} is balanced and validated.`;

                    }


                    if (salesSheetPostBtn) {

                        salesSheetPostBtn.disabled =
                            false;

                    }


                    alert(
                        `${ACTIVE_DOCUMENT} checked successfully.\n\nDebit and Credit are balanced.`
                    );

                }
            );


        /* =====================================================
           POST ENTRY

           PREVIEW ONLY.

           We deliberately DO NOT call the old
           /api/sales-journal POST yet because
           that endpoint only supports a single
           Debit + Credit pair.

           We also DO NOT create 01-0002 yet.
        ===================================================== */

        salesSheetPostBtn
            ?.addEventListener(
                "click",
                () => {

                    if (
                        !isCheckedAndSaved
                    ) {

                        alert(
                            "Please click Check & Save first."
                        );

                        return;

                    }


                    const totals =
                        calculateAccountingTotals();


                    if (
                        totals.difference >=
                        0.005
                    ) {

                        alert(
                            "The journal entry is no longer balanced."
                        );

                        isCheckedAndSaved =
                            false;

                        salesSheetPostBtn.disabled =
                            true;

                        return;

                    }


                    const previewData = {

                        document_no:
                            ACTIVE_DOCUMENT,

                        batch_id:
                            Number(
                                salesBatch.value
                            ),

                        entry_date:
                            salesDate?.value ||
                            "",

                        customer:
                            salesCustomer?.value ||
                            "",

                        payment_method:
                            salesPaymentMethod?.value ||
                            "",

                        products:
                            getProductRows(),

                        accounting_lines:
                            totals.rows,

                        total_debit:
                            totals.totalDebit,

                        total_credit:
                            totals.totalCredit,

                        difference:
                            totals.difference

                    };


                    console.log(
                        "NEURA SALES JOURNAL READY:",
                        previewData
                    );


                    alert(
                        `${ACTIVE_DOCUMENT} is ready to POST.\n\nNext step: connect this complete journal sheet to MySQL.\n\n01-0002 will only appear after successful posting.`
                    );

                }
            );


        /* =====================================================
           ESCAPE KEY
        ===================================================== */

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


        /* =====================================================
           CLICK OUTSIDE MODAL
        ===================================================== */

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
           INITIAL DOCUMENT NUMBER
        ===================================================== */

        if (salesDocumentNo) {

            salesDocumentNo.value =
                ACTIVE_DOCUMENT;

            salesDocumentNo.readOnly =
                true;

        }


        if (salesSheetActiveDocument) {

            salesSheetActiveDocument.textContent =
                ACTIVE_DOCUMENT;

        }


        if (salesSheetPostBtn) {

            salesSheetPostBtn.disabled =
                true;

        }

    }
);