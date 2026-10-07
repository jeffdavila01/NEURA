/* =========================================================
   NEURA EXCEL MODULES
   FILE: js/excel-modules.js

   SYSTEM-WIDE EXCEL CONFIGURATION
========================================================= */

(() => {
    "use strict";

    const {
        register,
        fetchJSON
    } =
        window.NEURAExcel;


    const accountPrefixes = {

        Assets:
            "01",

        Liabilities:
            "02",

        Equity:
            "03",

        Revenue:
            "04",

        Expenses:
            "05"

    };


    const accountType =
        value => {

            const map = {

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


            return map[
                String(
                    value ||
                    ""
                )
                    .trim()
                    .toLowerCase()
            ] || "";

        };


    const money =
        value => {

            const number =
                Number(

                    String(
                        value ??
                        ""
                    )
                        .replace(
                            /,/g,
                            ""
                        )
                        .replace(
                            /[^0-9.-]/g,
                            ""
                        )

                );


            return Number.isFinite(
                number
            )
                ? number
                : 0;

        };


    const dateValue =
        value => {

            const text =
                String(
                    value ||
                    ""
                ).trim();


            if (
                /^\d{4}-\d{2}-\d{2}$/
                    .test(
                        text
                    )
            ) {

                return text;

            }


            const match =
                text.match(
                    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/
                );


            if (
                !match
            ) {

                return "";

            }


            return `${match[3]}-${String(match[1]).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`;

        };


    /* =====================================================
       CHART OF ACCOUNTS
    ===================================================== */

    register({

        key:
            "accounts",


        label:
            "Chart of Accounts",


        pageSelector:
            "#accountTableBody",


        toolbarSelectors: [

            ".coa-toolbar-right",

            ".coa-toolbar"

        ],


        importSelectors: [

            "#importAccountBtn",

            "#importAccountsBtn"

        ],


        exportSelectors: [

            "#exportAccountBtn",

            "#exportAccountsBtn"

        ],


        sheetName:
            "Chart of Accounts",


        fileName:
            "NEURA_Chart_of_Accounts",


        columns: [

            {

                header:
                    "Account Code",

                key:
                    "account_code",

                aliases: [
                    "Code"
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
                    "Name"
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
                    "Type"
                ],

                minWidth:
                    16,

                maxWidth:
                    22

            }

        ],


        async getExportRows() {

            const data =
                await fetchJSON(
                    "/api/accounts",
                    {
                        cache:
                            "no-store"
                    }
                );


            return (
                data.accounts ||
                []
            )
                .map(
                    account => ({

                        account_code:
                            account.account_code,

                        account_name:
                            account.account_name,

                        account_type:
                            account.account_type

                    })
                );

        },


        async importRows(
            rows
        ) {

            const current =
                await fetchJSON(
                    "/api/accounts",
                    {
                        cache:
                            "no-store"
                    }
                );


            const codes =
                new Set(

                    (
                        current.accounts ||
                        []
                    )
                        .map(
                            account =>
                                String(
                                    account.account_code ||
                                    ""
                                )
                                    .toUpperCase()
                        )

                );


            let imported =
                0;


            let duplicate =
                0;


            let invalid =
                0;


            let failed =
                0;


            for (
                const row
                of rows
            ) {

                const type =
                    accountType(
                        row.account_type
                    );


                const name =
                    String(
                        row.account_name ||
                        ""
                    )
                        .trim();


                let code =
                    String(
                        row.account_code ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                if (
                    !type ||
                    !name
                ) {

                    invalid++;

                    continue;

                }


                /* Auto generate code */

                if (
                    !code
                ) {

                    try {

                        const next =
                            await fetchJSON(

                                `/api/accounts/next-code/${encodeURIComponent(
                                    type
                                )}`,

                                {
                                    cache:
                                        "no-store"
                                }

                            );


                        code =
                            next.account_code;


                    } catch {

                        failed++;

                        continue;

                    }

                }


                /* Check prefix */

                if (
                    !code.startsWith(
                        `${accountPrefixes[type]}-`
                    )
                ) {

                    invalid++;

                    continue;

                }


                /* Duplicate */

                if (
                    codes.has(
                        code
                    )
                ) {

                    duplicate++;

                    continue;

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


                    codes.add(
                        code
                    );


                    imported++;


                } catch (
                    error
                ) {

                    if (
                        /duplicate|already exists/i
                            .test(
                                error.message
                            )
                    ) {

                        duplicate++;

                    } else {

                        failed++;

                    }

                }

            }


            return {

                message:

                    `Chart of Accounts import finished.\n` +

                    `Imported: ${imported}\n` +

                    `Duplicates skipped: ${duplicate}\n` +

                    `Invalid rows: ${invalid}\n` +

                    `Failed: ${failed}`

            };

        },


        configureTemplate(
            ws
        ) {

            for (
                let row = 2;
                row <= 500;
                row++
            ) {

                ws.getCell(
                    `C${row}`
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


    /* =====================================================
       SUPPLIERS
    ===================================================== */

    register({

        key:
            "suppliers",


        label:
            "Suppliers",


        pageSelector:
            "#supplierTableBody",


        toolbarSelectors: [

            ".supplier-toolbar-right",

            ".supplier-toolbar"

        ],


        importSelectors: [

            "#importSupplierBtn"

        ],


        exportSelectors: [

            "#exportSupplierBtn"

        ],


        sheetName:
            "Suppliers",


        fileName:
            "NEURA_Suppliers",


        columns: [

            {
                header:
                    "Supplier Code",

                key:
                    "supplier_code",

                minWidth:
                    16,

                maxWidth:
                    20
            },

            {
                header:
                    "Supplier Name",

                key:
                    "supplier_name",

                minWidth:
                    24,

                maxWidth:
                    40
            },

            {
                header:
                    "Supplier Address",

                key:
                    "supplier_address",

                aliases: [
                    "Address"
                ],

                required:
                    false,

                minWidth:
                    25,

                maxWidth:
                    45
            },

            {
                header:
                    "TIN Number",

                key:
                    "tin_number",

                aliases: [
                    "TIN"
                ],

                required:
                    false,

                minWidth:
                    18,

                maxWidth:
                    25
            },

            {
                header:
                    "Contact Person",

                key:
                    "contact_person",

                required:
                    false,

                minWidth:
                    20,

                maxWidth:
                    30
            },

            {
                header:
                    "Contact Number",

                key:
                    "contact_number",

                required:
                    false,

                minWidth:
                    18,

                maxWidth:
                    25
            },

            {
                header:
                    "Email",

                key:
                    "email",

                required:
                    false,

                minWidth:
                    24,

                maxWidth:
                    38
            },

            {
                header:
                    "Supplier Type",

                key:
                    "supplier_type",

                required:
                    false,

                minWidth:
                    18,

                maxWidth:
                    28
            },

            {
                header:
                    "Payment Terms",

                key:
                    "payment_terms",

                required:
                    false,

                minWidth:
                    18,

                maxWidth:
                    28
            },

            {
                header:
                    "Status",

                key:
                    "status",

                required:
                    false,

                minWidth:
                    12,

                maxWidth:
                    16
            }

        ],


        async getExportRows() {

            const data =
                await fetchJSON(
                    "/api/suppliers",
                    {
                        cache:
                            "no-store"
                    }
                );


            return (
                data.suppliers ||
                []
            )
                .map(
                    supplier => ({

                        supplier_code:
                            supplier.supplier_code,

                        supplier_name:
                            supplier.supplier_name,

                        supplier_address:
                            supplier.supplier_address ||
                            "",

                        tin_number:
                            supplier.tin_number ||
                            "",

                        contact_person:
                            supplier.contact_person ||
                            "",

                        contact_number:
                            supplier.contact_number ||
                            "",

                        email:
                            supplier.email ||
                            "",

                        supplier_type:
                            supplier.supplier_type ||
                            "",

                        payment_terms:
                            supplier.payment_terms ||
                            "",

                        status:
                            supplier.status ||
                            "Active"

                    })
                );

        },


        async importRows(
            rows
        ) {

            const current =
                await fetchJSON(
                    "/api/suppliers",
                    {
                        cache:
                            "no-store"
                    }
                );


            const codes =
                new Set(

                    (
                        current.suppliers ||
                        []
                    )
                        .map(
                            supplier =>
                                String(
                                    supplier.supplier_code ||
                                    ""
                                )
                                    .toUpperCase()
                        )

                );


            let imported =
                0;


            let duplicate =
                0;


            let invalid =
                0;


            let failed =
                0;


            for (
                const row
                of rows
            ) {

                const name =
                    String(
                        row.supplier_name ||
                        ""
                    )
                        .trim();


                let code =
                    String(
                        row.supplier_code ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                if (
                    !name
                ) {

                    invalid++;

                    continue;

                }


                /* Auto supplier code */

                if (
                    !code
                ) {

                    try {

                        const next =
                            await fetchJSON(

                                "/api/suppliers/next-code",

                                {
                                    cache:
                                        "no-store"
                                }

                            );


                        code =
                            next.supplier_code;


                    } catch {

                        failed++;

                        continue;

                    }

                }


                if (
                    codes.has(
                        code
                    )
                ) {

                    duplicate++;

                    continue;

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
                                        code,

                                    supplier_name:
                                        name,

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


                    codes.add(
                        code
                    );


                    imported++;


                } catch (
                    error
                ) {

                    if (
                        /duplicate|already exists/i
                            .test(
                                error.message
                            )
                    ) {

                        duplicate++;

                    } else {

                        failed++;

                    }

                }

            }


            return {

                message:

                    `Supplier import finished.\n` +

                    `Imported: ${imported}\n` +

                    `Duplicates skipped: ${duplicate}\n` +

                    `Invalid rows: ${invalid}\n` +

                    `Failed: ${failed}`

            };

        },


        configureTemplate(
            ws
        ) {

            for (
                let row = 2;
                row <= 500;
                row++
            ) {

                ws.getCell(
                    `J${row}`
                )
                    .dataValidation =
                {

                    type:
                        "list",

                    allowBlank:
                        true,

                    formulae: [
                        '"Active,Inactive"'
                    ]

                };

            }

        }

    });

        /* =====================================================
       CUSTOMERS
    ===================================================== */

    register({

        key:
            "customers",


        label:
            "Customers",


        pageSelector:
            "#customerTableBody",


        toolbarSelectors: [

            ".customer-toolbar-right",

            ".customer-toolbar"

        ],


        importSelectors: [

            "#importCustomerBtn"

        ],


        exportSelectors: [

            "#exportCustomerBtn"

        ],


        sheetName:
            "Customers",


        fileName:
            "NEURA_Customers",


        columns: [

            {
                header:
                    "Customer Code",

                key:
                    "customer_code",

                aliases: [
                    "Code"
                ],

                minWidth:
                    16,

                maxWidth:
                    20
            },

            {
                header:
                    "Customer Name",

                key:
                    "customer_name",

                aliases: [
                    "Name"
                ],

                minWidth:
                    24,

                maxWidth:
                    40
            },

            {
                header:
                    "Customer Address",

                key:
                    "customer_address",

                aliases: [
                    "Address"
                ],

                required:
                    false,

                minWidth:
                    25,

                maxWidth:
                    45
            },

            {
                header:
                    "TIN Number",

                key:
                    "tin_number",

                aliases: [
                    "TIN"
                ],

                required:
                    false,

                minWidth:
                    18,

                maxWidth:
                    25
            },

            {
                header:
                    "Contact Person",

                key:
                    "contact_person",

                required:
                    false,

                minWidth:
                    20,

                maxWidth:
                    30
            },

            {
                header:
                    "Contact Number",

                key:
                    "contact_number",

                required:
                    false,

                minWidth:
                    18,

                maxWidth:
                    25
            },

            {
                header:
                    "Email",

                key:
                    "email",

                aliases: [
                    "Email Address"
                ],

                required:
                    false,

                minWidth:
                    24,

                maxWidth:
                    38
            },

            {
                header:
                    "Customer Type",

                key:
                    "customer_type",

                aliases: [
                    "Type"
                ],

                required:
                    false,

                minWidth:
                    18,

                maxWidth:
                    28
            },

            {
                header:
                    "Payment Terms",

                key:
                    "payment_terms",

                required:
                    false,

                minWidth:
                    18,

                maxWidth:
                    28
            },

            {
                header:
                    "Status",

                key:
                    "status",

                required:
                    false,

                minWidth:
                    12,

                maxWidth:
                    16
            }

        ],


        /* =================================================
           EXPORT CUSTOMER RECORDS
        ================================================= */

        async getExportRows() {

            const data =
                await fetchJSON(
                    "/api/customers",
                    {
                        cache:
                            "no-store"
                    }
                );


            return (
                data.customers ||
                []
            )
                .map(
                    customer => ({

                        customer_code:
                            customer.customer_code,

                        customer_name:
                            customer.customer_name,

                        customer_address:
                            customer.customer_address ||
                            "",

                        tin_number:
                            customer.tin_number ||
                            "",

                        contact_person:
                            customer.contact_person ||
                            "",

                        contact_number:
                            customer.contact_number ||
                            "",

                        email:
                            customer.email ||
                            "",

                        customer_type:
                            customer.customer_type ||
                            "",

                        payment_terms:
                            customer.payment_terms ||
                            "Cash",

                        status:
                            customer.status ||
                            "Active"

                    })
                );

        },


        /* =================================================
           IMPORT CUSTOMER RECORDS
        ================================================= */

        async importRows(
            rows
        ) {

            const current =
                await fetchJSON(
                    "/api/customers",
                    {
                        cache:
                            "no-store"
                    }
                );


            /* =============================================
               EXISTING CUSTOMER CODES
            ============================================= */

            const codes =
                new Set(

                    (
                        current.customers ||
                        []
                    )
                        .map(
                            customer =>
                                String(
                                    customer.customer_code ||
                                    ""
                                )
                                    .trim()
                                    .toUpperCase()
                        )

                );


            let imported =
                0;


            let duplicate =
                0;


            let invalid =
                0;


            let failed =
                0;


            /* =============================================
               PROCESS EACH EXCEL ROW
            ============================================= */

            for (
                const row
                of rows
            ) {

                const name =
                    String(
                        row.customer_name ||
                        ""
                    )
                        .trim();


                let code =
                    String(
                        row.customer_code ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                /* =========================================
                   CUSTOMER NAME REQUIRED
                ========================================= */

                if (
                    !name
                ) {

                    invalid++;

                    continue;

                }


                /* =========================================
                   AUTO CUSTOMER CODE

                   Blank Customer Code:
                   CUS-0001
                   CUS-0002
                   CUS-0003
                   etc.
                ========================================= */

                if (
                    !code
                ) {

                    try {

                        const next =
                            await fetchJSON(

                                "/api/customers/next-code",

                                {
                                    cache:
                                        "no-store"
                                }

                            );


                        code =
                            String(
                                next.customer_code ||
                                ""
                            )
                                .trim()
                                .toUpperCase();


                    } catch (
                        error
                    ) {

                        console.error(
                            "CUSTOMER NEXT CODE IMPORT ERROR:",
                            error
                        );

                        failed++;

                        continue;

                    }

                }


                /* =========================================
                   VALID CUSTOMER CODE
                ========================================= */

                if (
                    !/^CUS-\d{4,}$/i
                        .test(
                            code
                        )
                ) {

                    invalid++;

                    continue;

                }


                /* =========================================
                   DUPLICATE CHECK
                ========================================= */

                if (
                    codes.has(
                        code
                    )
                ) {

                    duplicate++;

                    continue;

                }


                /* =========================================
                   NORMALIZE CUSTOMER TYPE
                ========================================= */

                const rawCustomerType =
                    String(
                        row.customer_type ||
                        "Regular"
                    )
                        .trim();


                const validCustomerTypes = [

                    "Regular",
                    "Retail",
                    "Wholesale",
                    "Corporate",
                    "Government",
                    "Other"

                ];


                const normalizedCustomerType =
                    validCustomerTypes.find(
                        type =>
                            type.toLowerCase() ===
                            rawCustomerType.toLowerCase()
                    ) ||
                    "Regular";


                /* =========================================
                   NORMALIZE PAYMENT TERMS
                ========================================= */

                const rawPaymentTerms =
                    String(
                        row.payment_terms ||
                        "Cash"
                    )
                        .trim();


                const validPaymentTerms = [

                    "Cash",
                    "7 Days",
                    "15 Days",
                    "30 Days",
                    "60 Days"

                ];


                const normalizedPaymentTerms =
                    validPaymentTerms.find(
                        term =>
                            term.toLowerCase() ===
                            rawPaymentTerms.toLowerCase()
                    ) ||
                    "Cash";


                /* =========================================
                   NORMALIZE STATUS
                ========================================= */

                const normalizedStatus =

                    String(
                        row.status ||
                        "Active"
                    )
                        .trim()
                        .toLowerCase() ===
                    "inactive"

                        ? "Inactive"

                        : "Active";


                /* =========================================
                   SAVE CUSTOMER
                ========================================= */

                try {

                    await fetchJSON(
                        "/api/customers",
                        {

                            method:
                                "POST",


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
                                        String(
                                            row.customer_address ||
                                            ""
                                        )
                                            .trim(),

                                    tin_number:
                                        String(
                                            row.tin_number ||
                                            ""
                                        )
                                            .trim(),

                                    contact_person:
                                        String(
                                            row.contact_person ||
                                            ""
                                        )
                                            .trim(),

                                    contact_number:
                                        String(
                                            row.contact_number ||
                                            ""
                                        )
                                            .trim(),

                                    email:
                                        String(
                                            row.email ||
                                            ""
                                        )
                                            .trim(),

                                    customer_type:
                                        normalizedCustomerType,

                                    payment_terms:
                                        normalizedPaymentTerms,

                                    status:
                                        normalizedStatus

                                })

                        }
                    );


                    codes.add(
                        code
                    );


                    imported++;


                } catch (
                    error
                ) {

                    console.error(
                        "CUSTOMER IMPORT ROW ERROR:",
                        error
                    );


                    if (
                        /duplicate|already exists/i
                            .test(
                                error.message
                            )
                    ) {

                        duplicate++;

                    } else {

                        failed++;

                    }

                }

            }


            /* =============================================
               IMPORT RESULT
            ============================================= */

            return {

                message:

                    `Customer import finished.\n` +

                    `Imported: ${imported}\n` +

                    `Duplicates skipped: ${duplicate}\n` +

                    `Invalid rows: ${invalid}\n` +

                    `Failed: ${failed}`

            };

        },


        /* =================================================
           CUSTOMER EXCEL TEMPLATE
        ================================================= */

        configureTemplate(
            ws
        ) {

            for (
                let row = 2;
                row <= 500;
                row++
            ) {

                /* CUSTOMER TYPE - COLUMN H */

                ws.getCell(
                    `H${row}`
                )
                    .dataValidation =
                {

                    type:
                        "list",

                    allowBlank:
                        true,

                    formulae: [

                        '"Regular,Retail,Wholesale,Corporate,Government,Other"'

                    ]

                };


                /* PAYMENT TERMS - COLUMN I */

                ws.getCell(
                    `I${row}`
                )
                    .dataValidation =
                {

                    type:
                        "list",

                    allowBlank:
                        true,

                    formulae: [

                        '"Cash,7 Days,15 Days,30 Days,60 Days"'

                    ]

                };


                /* STATUS - COLUMN J */

                ws.getCell(
                    `J${row}`
                )
                    .dataValidation =
                {

                    type:
                        "list",

                    allowBlank:
                        true,

                    formulae: [

                        '"Active,Inactive"'

                    ]

                };

            }

        }

    });


    /* =====================================================
       PURCHASE JOURNAL
    ===================================================== */

    register({

        key:
            "purchaseJournal",


        label:
            "Purchase Journal",


        pageSelector:
            "#purchaseJournalTableBody",


        toolbarSelectors: [

            ".purchase-toolbar"

        ],


        sheetName:
            "Purchase Journal",


        fileName:
            "NEURA_Purchase_Journal",


        columns: [

            {
                header:
                    "Date",

                key:
                    "entry_date",

                aliases: [
                    "Entry Date"
                ],

                minWidth:
                    14,

                maxWidth:
                    18
            },

            {
                header:
                    "Batch Code",

                key:
                    "batch_code",

                aliases: [
                    "Batch"
                ],

                minWidth:
                    16,

                maxWidth:
                    22
            },

            {
                header:
                    "Document No",

                key:
                    "document_no",

                aliases: [
                    "Doc No"
                ],

                minWidth:
                    18,

                maxWidth:
                    24
            },

            {
                header:
                    "Payee",

                key:
                    "payee",

                minWidth:
                    24,

                maxWidth:
                    36
            },

            {
                header:
                    "Debit Account Code",

                key:
                    "debit_account_code",

                minWidth:
                    20,

                maxWidth:
                    26
            },

            {
                header:
                    "Debit Account Name",

                key:
                    "debit_account_name",

                required:
                    false,

                minWidth:
                    24,

                maxWidth:
                    38
            },

            {
                header:
                    "Debit Amount",

                key:
                    "debit_amount",

                minWidth:
                    18,

                maxWidth:
                    22,

                numFmt:
                    "#,##0.00"
            },

            {
                header:
                    "Credit Account Code",

                key:
                    "credit_account_code",

                minWidth:
                    20,

                maxWidth:
                    26
            },

            {
                header:
                    "Credit Account Name",

                key:
                    "credit_account_name",

                required:
                    false,

                minWidth:
                    24,

                maxWidth:
                    38
            },

            {
                header:
                    "Credit Amount",

                key:
                    "credit_amount",

                minWidth:
                    18,

                maxWidth:
                    22,

                numFmt:
                    "#,##0.00"
            },

            {
                header:
                    "Particulars",

                key:
                    "particulars",

                required:
                    false,

                minWidth:
                    24,

                maxWidth:
                    45
            },

            {
                header:
                    "Business Activity",

                key:
                    "business_activity",

                required:
                    false,

                minWidth:
                    22,

                maxWidth:
                    36
            },

            {
                header:
                    "Status",

                key:
                    "status",

                required:
                    false,

                minWidth:
                    12,

                maxWidth:
                    18
            }

        ],


        async getExportRows() {

            const data =
                await fetchJSON(

                    "/api/purchase-journal",

                    {
                        cache:
                            "no-store"
                    }

                );


            return (
                data.entries ||
                []
            )
                .map(
                    entry => ({

                        entry_date:
                            entry.entry_date,

                        batch_code:
                            entry.batch_code,

                        document_no:
                            entry.document_no,

                        payee:
                            entry.payee,

                        debit_account_code:
                            entry.debit_account_code,

                        debit_account_name:
                            entry.debit_account_name,

                        debit_amount:
                            Number(
                                entry.debit_amount
                            ) || 0,

                        credit_account_code:
                            entry.credit_account_code,

                        credit_account_name:
                            entry.credit_account_name,

                        credit_amount:
                            Number(
                                entry.credit_amount
                            ) || 0,

                        particulars:
                            entry.particulars ||
                            "",

                        business_activity:
                            entry.business_activity ||
                            "",

                        status:
                            entry.status ||
                            ""

                    })
                );

        },


        async importRows(
            rows
        ) {

            const [
                batchData,
                accountData,
                currentData
            ] =
                await Promise.all(
                    [

                        fetchJSON(
                            "/api/purchase-batches",
                            {
                                cache:
                                    "no-store"
                            }
                        ),

                        fetchJSON(
                            "/api/accounts",
                            {
                                cache:
                                    "no-store"
                            }
                        ),

                        fetchJSON(
                            "/api/purchase-journal",
                            {
                                cache:
                                    "no-store"
                            }
                        )

                    ]
                );


            const batches =
                new Map(

                    (
                        batchData.batches ||
                        []
                    )
                        .map(
                            batch => [

                                String(
                                    batch.batch_code ||
                                    ""
                                )
                                    .toUpperCase(),

                                batch

                            ]
                        )

                );


            const accounts =
                new Map(

                    (
                        accountData.accounts ||
                        []
                    )
                        .map(
                            account => [

                                String(
                                    account.account_code ||
                                    ""
                                )
                                    .toUpperCase(),

                                account

                            ]
                        )

                );


            const existing =
                new Set(

                    (
                        currentData.entries ||
                        []
                    )
                        .map(
                            entry => [

                                entry.entry_date,

                                String(
                                    entry.batch_code ||
                                    ""
                                )
                                    .toUpperCase(),

                                String(
                                    entry.document_no ||
                                    ""
                                )
                                    .toUpperCase(),

                                String(
                                    entry.payee ||
                                    ""
                                )
                                    .toUpperCase()

                            ].join(
                                "|"
                            )
                        )

                );


            let imported =
                0;


            let duplicate =
                0;


            let invalid =
                0;


            let failed =
                0;


            for (
                const row
                of rows
            ) {

                const date =
                    dateValue(
                        row.entry_date
                    );


                const batchCode =
                    String(
                        row.batch_code ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                const doc =
                    String(
                        row.document_no ||
                        ""
                    )
                        .trim();


                const payee =
                    String(
                        row.payee ||
                        ""
                    )
                        .trim();


                const debitCode =
                    String(
                        row.debit_account_code ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                const creditCode =
                    String(
                        row.credit_account_code ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                const debit =
                    money(
                        row.debit_amount
                    );


                const credit =
                    money(
                        row.credit_amount
                    );


                const batch =
                    batches.get(
                        batchCode
                    );


                const debitAccount =
                    accounts.get(
                        debitCode
                    );


                const creditAccount =
                    accounts.get(
                        creditCode
                    );


                if (
                    !date ||
                    !batch ||
                    !doc ||
                    !payee ||
                    !debitAccount ||
                    !creditAccount ||
                    debit <= 0 ||
                    credit <= 0 ||
                    Math.abs(
                        debit -
                        credit
                    ) >= 0.005
                ) {

                    invalid++;

                    continue;

                }


                const key = [

                    date,

                    batchCode,

                    doc.toUpperCase(),

                    payee.toUpperCase()

                ].join(
                    "|"
                );


                if (
                    existing.has(
                        key
                    )
                ) {

                    duplicate++;

                    continue;

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
                                            batch.batch_id
                                        ),

                                    entry_date:
                                        date,

                                    document_no:
                                        doc,

                                    payee:
                                        payee,

                                    debit_account_id:
                                        Number(
                                            debitAccount.account_id
                                        ),

                                    debit_amount:
                                        debit,

                                    credit_account_id:
                                        Number(
                                            creditAccount.account_id
                                        ),

                                    credit_amount:
                                        credit,

                                    particulars:
                                        String(
                                            row.particulars ||
                                            ""
                                        ).trim(),

                                    business_activity:
                                        String(
                                            row.business_activity ||
                                            ""
                                        ).trim()

                                })

                        }
                    );


                    existing.add(
                        key
                    );


                    imported++;


                } catch {

                    failed++;

                }

            }


            return {

                message:

                    `Purchase Journal import finished.\n` +

                    `Imported: ${imported}\n` +

                    `Duplicates skipped: ${duplicate}\n` +

                    `Invalid / unbalanced rows: ${invalid}\n` +

                    `Failed: ${failed}`

            };

        }

    });


    /* =====================================================
       SALES JOURNAL
    ===================================================== */

    register({

        key:
            "salesJournal",


        label:
            "Sales Journal",


        pageSelector:
            "#salesJournalTableBody",


        toolbarSelectors: [

            ".purchase-toolbar"

        ],


        sheetName:
            "Sales Journal",


        fileName:
            "NEURA_Sales_Journal",


        columns: [

            {
                header:
                    "Date",

                key:
                    "entry_date",

                aliases: [
                    "Entry Date"
                ],

                minWidth:
                    14,

                maxWidth:
                    18
            },

            {
                header:
                    "Batch Code",

                key:
                    "batch_code",

                aliases: [
                    "Batch"
                ],

                minWidth:
                    16,

                maxWidth:
                    22
            },

            {
                header:
                    "Document No",

                key:
                    "document_no",

                aliases: [
                    "Doc No"
                ],

                minWidth:
                    18,

                maxWidth:
                    24
            },

            {
                header:
                    "Customer",

                key:
                    "customer_name",

                aliases: [
                    "Customer Name"
                ],

                minWidth:
                    24,

                maxWidth:
                    36
            },

            {
                header:
                    "Debit Account Code",

                key:
                    "debit_account_code",

                minWidth:
                    20,

                maxWidth:
                    26
            },

            {
                header:
                    "Debit Account Name",

                key:
                    "debit_account_name",

                required:
                    false,

                minWidth:
                    24,

                maxWidth:
                    38
            },

            {
                header:
                    "Debit Amount",

                key:
                    "debit_amount",

                minWidth:
                    18,

                maxWidth:
                    22,

                numFmt:
                    "#,##0.00"
            },

            {
                header:
                    "Credit Account Code",

                key:
                    "credit_account_code",

                minWidth:
                    20,

                maxWidth:
                    26
            },

            {
                header:
                    "Credit Account Name",

                key:
                    "credit_account_name",

                required:
                    false,

                minWidth:
                    24,

                maxWidth:
                    38
            },

            {
                header:
                    "Credit Amount",

                key:
                    "credit_amount",

                minWidth:
                    18,

                maxWidth:
                    22,

                numFmt:
                    "#,##0.00"
            },

            {
                header:
                    "Particulars",

                key:
                    "particulars",

                required:
                    false,

                minWidth:
                    24,

                maxWidth:
                    45
            },

            {
                header:
                    "Business Activity",

                key:
                    "business_activity",

                required:
                    false,

                minWidth:
                    22,

                maxWidth:
                    36
            },

            {
                header:
                    "Status",

                key:
                    "status",

                required:
                    false,

                minWidth:
                    12,

                maxWidth:
                    18
            }

        ],


        async getExportRows() {

            const data =
                await fetchJSON(

                    "/api/sales-journal",

                    {
                        cache:
                            "no-store"
                    }

                );


            return (
                data.entries ||
                []
            )
                .map(
                    entry => ({

                        entry_date:
                            entry.entry_date,

                        batch_code:
                            entry.batch_code,

                        document_no:
                            entry.document_no,

                        customer_name:
                            entry.customer_name,

                        debit_account_code:
                            entry.debit_account_code,

                        debit_account_name:
                            entry.debit_account_name,

                        debit_amount:
                            Number(
                                entry.debit_amount
                            ) || 0,

                        credit_account_code:
                            entry.credit_account_code,

                        credit_account_name:
                            entry.credit_account_name,

                        credit_amount:
                            Number(
                                entry.credit_amount
                            ) || 0,

                        particulars:
                            entry.particulars ||
                            "",

                        business_activity:
                            entry.business_activity ||
                            "",

                        status:
                            entry.status ||
                            ""

                    })
                );

        },


        async importRows(
            rows
        ) {

            const [
                batchData,
                accountData,
                currentData
            ] =
                await Promise.all(
                    [

                        fetchJSON(
                            "/api/sales-batches",
                            {
                                cache:
                                    "no-store"
                            }
                        ),

                        fetchJSON(
                            "/api/accounts",
                            {
                                cache:
                                    "no-store"
                            }
                        ),

                        fetchJSON(
                            "/api/sales-journal",
                            {
                                cache:
                                    "no-store"
                            }
                        )

                    ]
                );


            const batches =
                new Map(

                    (
                        batchData.batches ||
                        []
                    )
                        .map(
                            batch => [

                                String(
                                    batch.batch_code ||
                                    ""
                                )
                                    .toUpperCase(),

                                batch

                            ]
                        )

                );


            const accounts =
                new Map(

                    (
                        accountData.accounts ||
                        []
                    )
                        .map(
                            account => [

                                String(
                                    account.account_code ||
                                    ""
                                )
                                    .toUpperCase(),

                                account

                            ]
                        )

                );


            const existing =
                new Set(

                    (
                        currentData.entries ||
                        []
                    )
                        .map(
                            entry => [

                                entry.entry_date,

                                String(
                                    entry.batch_code ||
                                    ""
                                )
                                    .toUpperCase(),

                                String(
                                    entry.document_no ||
                                    ""
                                )
                                    .toUpperCase(),

                                String(
                                    entry.customer_name ||
                                    ""
                                )
                                    .toUpperCase()

                            ].join(
                                "|"
                            )
                        )

                );


            let imported =
                0;


            let duplicate =
                0;


            let invalid =
                0;


            let failed =
                0;


            for (
                const row
                of rows
            ) {

                const date =
                    dateValue(
                        row.entry_date
                    );


                const batchCode =
                    String(
                        row.batch_code ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                const doc =
                    String(
                        row.document_no ||
                        ""
                    )
                        .trim();


                const customer =
                    String(
                        row.customer_name ||
                        ""
                    )
                        .trim();


                const debitCode =
                    String(
                        row.debit_account_code ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                const creditCode =
                    String(
                        row.credit_account_code ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                const debit =
                    money(
                        row.debit_amount
                    );


                const credit =
                    money(
                        row.credit_amount
                    );


                const batch =
                    batches.get(
                        batchCode
                    );


                const debitAccount =
                    accounts.get(
                        debitCode
                    );


                const creditAccount =
                    accounts.get(
                        creditCode
                    );


                if (
                    !date ||
                    !batch ||
                    !doc ||
                    !customer ||
                    !debitAccount ||
                    !creditAccount ||
                    Number(
                        debitAccount.account_id
                    ) ===
                    Number(
                        creditAccount.account_id
                    ) ||
                    debit <= 0 ||
                    credit <= 0 ||
                    Math.abs(
                        debit -
                        credit
                    ) >= 0.005
                ) {

                    invalid++;

                    continue;

                }


                const key = [

                    date,

                    batchCode,

                    doc.toUpperCase(),

                    customer.toUpperCase()

                ].join(
                    "|"
                );


                if (
                    existing.has(
                        key
                    )
                ) {

                    duplicate++;

                    continue;

                }


                try {

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
                                JSON.stringify({

                                    batch_id:
                                        Number(
                                            batch.batch_id
                                        ),

                                    entry_date:
                                        date,

                                    document_no:
                                        doc,

                                    customer_name:
                                        customer,

                                    debit_account_id:
                                        Number(
                                            debitAccount.account_id
                                        ),

                                    debit_amount:
                                        debit,

                                    credit_account_id:
                                        Number(
                                            creditAccount.account_id
                                        ),

                                    credit_amount:
                                        credit,

                                    particulars:
                                        String(
                                            row.particulars ||
                                            ""
                                        ).trim(),

                                    business_activity:
                                        String(
                                            row.business_activity ||
                                            ""
                                        ).trim()

                                })

                        }
                    );


                    existing.add(
                        key
                    );


                    imported++;


                } catch (
                    error
                ) {

                    console.error(
                        "IMPORT SALES JOURNAL ROW ERROR:",
                        error
                    );

                    failed++;

                }

            }


            return {

                message:

                    `Sales Journal import finished.\n` +

                    `Imported: ${imported}\n` +

                    `Duplicates skipped: ${duplicate}\n` +

                    `Invalid / unbalanced rows: ${invalid}\n` +

                    `Failed: ${failed}`

            };

        }

    });


    /* =====================================================
       CORE PAGE RECOVERY

       Only runs if a page is still stuck at Loading...
       Existing working app.js functions stay untouched.
    ===================================================== */

    const esc =
        value =>
            String(
                value ??
                ""
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


    const today =
        () => {

            const d =
                new Date();


            return new Date(

                d.getTime() -

                d.getTimezoneOffset() *
                60000

            )
                .toISOString()
                .split(
                    "T"
                )[0];

        };


    const peso =
        value =>
            new Intl.NumberFormat(
                "en-PH",
                {

                    style:
                        "currency",

                    currency:
                        "PHP"

                }
            )
                .format(
                    Number(
                        value
                    ) || 0
                );


    /* =====================================================
       CHART OF ACCOUNTS RECOVERY
    ===================================================== */

    async function repairChart() {

        const body =
            document.querySelector(
                "#accountTableBody"
            );


        if (
            !body ||
            !/loading/i.test(
                body.textContent ||
                ""
            )
        ) {

            return;

        }


        const form =
            document.querySelector(
                "#accountForm"
            );


        const type =
            document.querySelector(
                "#accountType"
            );


        const code =
            document.querySelector(
                "#accountCode"
            );


        const name =
            document.querySelector(
                "#accountName"
            );


        const search =
            document.querySelector(
                "#accountSearch"
            );


        const create =
            document.querySelector(
                "#createAccountBtn"
            );


        const panel =
            document.querySelector(
                "#accountFormPanel"
            );


        let accounts =
            [];


        function render(
            list
        ) {

            body.innerHTML =
                list.length

                    ? list.map(
                        account => `

                            <tr>

                                <td>
                                    ${esc(
                                        account.account_code
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        account.account_name
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        account.account_type
                                    )}
                                </td>

                            </tr>

                        `
                    )
                        .join("")

                    : `

                        <tr class="empty-row">

                            <td colspan="3">
                                No accounts found.
                            </td>

                        </tr>

                    `;

        }


        async function load() {

            const data =
                await fetchJSON(

                    "/api/accounts",

                    {
                        cache:
                            "no-store"
                    }

                );


            accounts =
                data.accounts ||
                [];


            render(
                accounts
            );

        }


        async function nextCode() {

            if (
                !type?.value ||
                !code
            ) {

                return;

            }


            const data =
                await fetchJSON(

                    `/api/accounts/next-code/${encodeURIComponent(
                        type.value
                    )}`,

                    {
                        cache:
                            "no-store"
                    }

                );


            code.value =
                data.account_code;

        }


        try {

            await load();

            await nextCode();


        } catch (
            error
        ) {

            body.innerHTML = `

                <tr class="empty-row">

                    <td colspan="3">
                        Unable to load accounts.
                    </td>

                </tr>

            `;


            console.error(
                error
            );


            return;

        }


        if (
            type &&
            !type.dataset
                .neuraRepair
        ) {

            type.dataset.neuraRepair =
                "1";


            type.addEventListener(
                "change",
                () => {

                    nextCode()
                        .catch(
                            console.error
                        );

                }
            );

        }


        if (
            search &&
            !search.dataset
                .neuraRepair
        ) {

            search.dataset.neuraRepair =
                "1";


            search.addEventListener(
                "input",
                () => {

                    const q =
                        search.value
                            .trim()
                            .toLowerCase();


                    render(

                        !q

                            ? accounts

                            : accounts.filter(
                                account =>

                                    [

                                        account.account_code,

                                        account.account_name,

                                        account.account_type

                                    ]
                                        .some(
                                            value =>

                                                String(
                                                    value ||
                                                    ""
                                                )
                                                    .toLowerCase()
                                                    .includes(
                                                        q
                                                    )
                                        )
                            )

                    );

                }
            );

        }


        if (
            create &&
            !create.dataset
                .neuraRepair
        ) {

            create.dataset.neuraRepair =
                "1";


            create.addEventListener(
                "click",
                async () => {

                    await nextCode()
                        .catch(
                            console.error
                        );


                    panel
                        ?.scrollIntoView(
                            {

                                behavior:
                                    "smooth",

                                block:
                                    "center"

                            }
                        );


                    name?.focus();

                }
            );

        }


        if (
            form &&
            !form.dataset
                .neuraRepair
        ) {

            form.dataset.neuraRepair =
                "1";


            form.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const accountTypeValue =
                        type?.value ||
                        "";


                    const accountCodeValue =
                        code?.value
                            .trim() ||
                        "";


                    const accountNameValue =
                        name?.value
                            .trim() ||
                        "";


                    if (
                        !accountTypeValue ||
                        !accountCodeValue ||
                        !accountNameValue
                    ) {

                        alert(
                            "Please complete all account fields."
                        );


                        return;

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
                                            accountCodeValue,

                                        account_name:
                                            accountNameValue,

                                        account_type:
                                            accountTypeValue

                                    })

                            }
                        );


                        if (
                            name
                        ) {

                            name.value =
                                "";

                        }


                        await load();

                        await nextCode();


                        name?.focus();


                        alert(

                            `${accountCodeValue} - ${accountNameValue} created successfully.`

                        );


                    } catch (
                        error
                    ) {

                        alert(
                            error.message
                        );

                    }

                }
            );

        }

    }


    /* =====================================================
       PURCHASE JOURNAL RECOVERY
    ===================================================== */

    async function repairPurchase() {

        const batchBody =
            document.querySelector(
                "#purchaseBatchTableBody"
            );


        if (
            !batchBody ||
            !/loading/i.test(
                batchBody.textContent ||
                ""
            )
        ) {

            return;

        }


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


        const batchSelect =
            document.querySelector(
                "#purchaseBatch"
            );


        const entryForm =
            document.querySelector(
                "#purchaseEntryForm"
            );


        const entryDate =
            document.querySelector(
                "#purchaseDate"
            );


        const documentNo =
            document.querySelector(
                "#purchaseDocumentNo"
            );


        const payee =
            document.querySelector(
                "#purchasePayee"
            );


        const debitAccount =
            document.querySelector(
                "#purchaseDebitAccount"
            );


        const debitAmount =
            document.querySelector(
                "#purchaseDebitAmount"
            );


        const creditAccount =
            document.querySelector(
                "#purchaseCreditAccount"
            );


        const creditAmount =
            document.querySelector(
                "#purchaseCreditAmount"
            );


        const particulars =
            document.querySelector(
                "#purchaseParticulars"
            );


        const activity =
            document.querySelector(
                "#purchaseBusinessActivity"
            );


        const debitTotal =
            document.querySelector(
                "#purchaseDebitTotal"
            );


        const creditTotal =
            document.querySelector(
                "#purchaseCreditTotal"
            );


        const difference =
            document.querySelector(
                "#purchaseDifference"
            );


        const journalBody =
            document.querySelector(
                "#purchaseJournalTableBody"
            );


        function totals() {

            const debit =
                Number(
                    debitAmount
                        ?.value
                ) || 0;


            const credit =
                Number(
                    creditAmount
                        ?.value
                ) || 0;


            if (
                debitTotal
            ) {

                debitTotal.textContent =
                    peso(
                        debit
                    );

            }


            if (
                creditTotal
            ) {

                creditTotal.textContent =
                    peso(
                        credit
                    );

            }


            if (
                difference
            ) {

                difference.textContent =
                    peso(

                        Math.abs(
                            debit -
                            credit
                        )

                    );

            }

        }


        async function load() {

            const [
                batchData,
                accountData,
                journalData
            ] =
                await Promise.all(
                    [

                        fetchJSON(
                            "/api/purchase-batches",
                            {
                                cache:
                                    "no-store"
                            }
                        ),

                        fetchJSON(
                            "/api/accounts",
                            {
                                cache:
                                    "no-store"
                            }
                        ),

                        fetchJSON(
                            "/api/purchase-journal",
                            {
                                cache:
                                    "no-store"
                            }
                        )

                    ]
                );


            const batches =
                batchData.batches ||
                [];


            const accounts =
                accountData.accounts ||
                [];


            const entries =
                journalData.entries ||
                [];


            batchBody.innerHTML =

                batches.length

                    ? batches.map(
                        batch => `

                            <tr>

                                <td>
                                    ${esc(
                                        batch.batch_code
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        batch.batch_name
                                    )}
                                </td>

                                <td>

                                    <button
                                        type="button"
                                        class="secondary-btn neura-use-batch"
                                        data-id="${Number(
                                            batch.batch_id
                                        )}"
                                    >
                                        Use Batch
                                    </button>

                                </td>

                            </tr>

                        `
                    )
                        .join("")

                    : `

                        <tr class="empty-row">

                            <td colspan="3">
                                No purchase batches found.
                            </td>

                        </tr>

                    `;


            if (
                batchSelect
            ) {

                batchSelect.innerHTML = `

                    <option value="">
                        Select Batch
                    </option>

                    ${
                        batches.map(
                            batch => `

                                <option
                                    value="${Number(
                                        batch.batch_id
                                    )}"
                                >
                                    ${esc(
                                        batch.batch_code
                                    )}
                                    -
                                    ${esc(
                                        batch.batch_name
                                    )}
                                </option>

                            `
                        )
                            .join("")
                    }

                `;

            }


            const accountOptions =

                accounts.map(
                    account => `

                        <option
                            value="${Number(
                                account.account_id
                            )}"
                        >
                            ${esc(
                                account.account_code
                            )}
                            -
                            ${esc(
                                account.account_name
                            )}
                        </option>

                    `
                )
                    .join("");


            if (
                debitAccount
            ) {

                debitAccount.innerHTML = `

                    <option value="">
                        Select Account
                    </option>

                    ${accountOptions}

                `;

            }


            if (
                creditAccount
            ) {

                creditAccount.innerHTML = `

                    <option value="">
                        Select Account
                    </option>

                    ${accountOptions}

                `;

            }


            if (
                journalBody
            ) {

                journalBody.innerHTML =

                    entries.length

                        ? entries.map(
                            entry => `

                                <tr>

                                    <td>
                                        ${esc(
                                            entry.entry_date
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            entry.document_no
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            entry.payee
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            entry.debit_account_code
                                        )}
                                        -
                                        ${esc(
                                            entry.debit_account_name
                                        )}
                                    </td>

                                    <td>
                                        ${peso(
                                            entry.debit_amount
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            entry.credit_account_code
                                        )}
                                        -
                                        ${esc(
                                            entry.credit_account_name
                                        )}
                                    </td>

                                    <td>
                                        ${peso(
                                            entry.credit_amount
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            entry.particulars ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            entry.business_activity ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            entry.status ||
                                            ""
                                        )}
                                    </td>

                                </tr>

                            `
                        )
                            .join("")

                        : `

                            <tr class="empty-row">

                                <td colspan="10">
                                    No purchase journal entries.
                                </td>

                            </tr>

                        `;

            }

        }


        if (
            entryDate &&
            !entryDate.value
        ) {

            entryDate.value =
                today();

        }


        totals();


        try {

            await load();


        } catch (
            error
        ) {

            console.error(
                error
            );


            return;

        }


        if (
            !batchBody.dataset
                .neuraRepair
        ) {

            batchBody.dataset.neuraRepair =
                "1";


            batchBody.addEventListener(
                "click",
                event => {

                    const button =
                        event.target.closest(
                            ".neura-use-batch"
                        );


                    if (
                        button &&
                        batchSelect
                    ) {

                        batchSelect.value =
                            button.dataset.id;

                    }

                }
            );

        }


        if (
            batchForm &&
            !batchForm.dataset
                .neuraRepair
        ) {

            batchForm.dataset.neuraRepair =
                "1";


            batchForm.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const code =
                        batchCode?.value
                            .trim()
                            .toUpperCase() ||
                        "";


                    const name =
                        batchName?.value
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


                    try {

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


                        batchForm.reset();


                        await load();


                        alert(

                            `${code} - ${name} created successfully.`

                        );


                    } catch (
                        error
                    ) {

                        alert(
                            error.message
                        );

                    }

                }
            );

        }


        debitAmount
            ?.addEventListener(
                "input",
                totals
            );


        creditAmount
            ?.addEventListener(
                "input",
                totals
            );


        if (
            entryForm &&
            !entryForm.dataset
                .neuraRepair
        ) {

            entryForm.dataset.neuraRepair =
                "1";


            entryForm.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const debit =
                        Number(
                            debitAmount
                                ?.value
                        ) || 0;


                    const credit =
                        Number(
                            creditAmount
                                ?.value
                        ) || 0;


                    if (
                        !batchSelect?.value ||
                        !entryDate?.value ||
                        !documentNo?.value
                            .trim() ||
                        !payee?.value
                            .trim() ||
                        !debitAccount?.value ||
                        !creditAccount?.value
                    ) {

                        alert(
                            "Please complete all required purchase entry fields."
                        );


                        return;

                    }


                    if (
                        debit <= 0 ||
                        credit <= 0 ||
                        Math.abs(
                            debit -
                            credit
                        ) >= 0.005
                    ) {

                        alert(
                            "Debit and Credit must be greater than zero and equal."
                        );


                        return;

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
                                            entryDate.value,

                                        document_no:
                                            documentNo.value
                                                .trim(),

                                        payee:
                                            payee.value
                                                .trim(),

                                        debit_account_id:
                                            Number(
                                                debitAccount.value
                                            ),

                                        debit_amount:
                                            debit,

                                        credit_account_id:
                                            Number(
                                                creditAccount.value
                                            ),

                                        credit_amount:
                                            credit,

                                        particulars:
                                            particulars?.value
                                                .trim() ||
                                            "",

                                        business_activity:
                                            activity?.value
                                                .trim() ||
                                            ""

                                    })

                            }
                        );


                        const selectedBatch =
                            batchSelect.value;


                        entryForm.reset();


                        batchSelect.value =
                            selectedBatch;


                        entryDate.value =
                            today();


                        totals();


                        await load();


                        alert(
                            "Purchase journal entry posted successfully."
                        );


                    } catch (
                        error
                    ) {

                        alert(
                            error.message
                        );

                    }

                }
            );

        }

    }


    /* =====================================================
       RECOVER LEGACY FUNCTIONS IF STILL LOADING
    ===================================================== */

    async function recoverLegacyOrFallback() {

        const accountBody =
            document.querySelector(
                "#accountTableBody"
            );


        const purchaseBody =
            document.querySelector(
                "#purchaseBatchTableBody"
            );


        const supplierBody =
            document.querySelector(
                "#supplierTableBody"
            );


        /* Chart */

        if (
            accountBody &&
            /loading/i.test(
                accountBody.textContent ||
                ""
            )
        ) {

            if (
                typeof window
                    .initChartOfAccounts ===
                "function"
            ) {

                try {

                    window
                        .initChartOfAccounts();


                } catch (
                    error
                ) {

                    console.error(
                        error
                    );

                }


                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            250
                        )
                );

            }


            if (
                /loading/i.test(
                    accountBody.textContent ||
                    ""
                )
            ) {

                await repairChart();

            }

        }


        /* Purchase Journal */

        if (
            purchaseBody &&
            /loading/i.test(
                purchaseBody.textContent ||
                ""
            )
        ) {

            if (
                typeof window
                    .initPurchaseJournal ===
                "function"
            ) {

                try {

                    window
                        .initPurchaseJournal();


                } catch (
                    error
                ) {

                    console.error(
                        error
                    );

                }


                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            250
                        )
                );

            }


            if (
                /loading/i.test(
                    purchaseBody.textContent ||
                    ""
                )
            ) {

                await repairPurchase();

            }

        }


        /* Supplier */

        if (
            supplierBody &&
            /loading/i.test(
                supplierBody.textContent ||
                ""
            )
        ) {

            if (
                typeof window
                    .initSuppliers ===
                "function"
            ) {

                try {

                    window
                        .initSuppliers();


                } catch (
                    error
                ) {

                    console.error(
                        error
                    );

                }

            } else {

                try {

                    const data =
                        await fetchJSON(

                            "/api/suppliers",

                            {
                                cache:
                                    "no-store"
                            }

                        );


                    const suppliers =
                        data.suppliers ||
                        [];


                    supplierBody.innerHTML =

                        suppliers.length

                            ? suppliers.map(
                                supplier => `

                                    <tr>

                                        <td>
                                            ${esc(
                                                supplier.supplier_code
                                            )}
                                        </td>

                                        <td>
                                            ${esc(
                                                supplier.supplier_name
                                            )}
                                        </td>

                                        <td>
                                            ${esc(
                                                supplier.tin_number ||
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            ${esc(
                                                supplier.contact_person ||
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            ${esc(
                                                supplier.contact_number ||
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            ${esc(
                                                supplier.supplier_type ||
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            ${esc(
                                                supplier.payment_terms ||
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            ${esc(
                                                supplier.status ||
                                                "Active"
                                            )}
                                        </td>

                                        <td>
                                        </td>

                                    </tr>

                                `
                            )
                                .join("")

                            : `

                                <tr class="empty-row">

                                    <td colspan="9">
                                        No suppliers found.
                                    </td>

                                </tr>

                            `;


                } catch (
                    error
                ) {

                    supplierBody.innerHTML = `

                        <tr class="empty-row">

                            <td colspan="9">
                                Unable to load suppliers.
                            </td>

                        </tr>

                    `;

                }

            }

        }

    }


    document.addEventListener(
        "DOMContentLoaded",
        () => {

            setTimeout(
                () => {

                    recoverLegacyOrFallback()
                        .catch(
                            console.error
                        );

                },
                700
            );

        }
    );

})();