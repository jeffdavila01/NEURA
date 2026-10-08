require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3005;


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


/* =========================================================
   MYSQL CONNECTION
========================================================= */

const useDbSsl =
    String(
        process.env.DB_SSL || ""
    ).toLowerCase() === "true";

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,

    ssl: useDbSsl
        ? {}
        : undefined,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


/* =========================================================
   ACCOUNT TYPE PREFIX
========================================================= */

const accountTypePrefixes = {
    Assets: "01",
    Liabilities: "02",
    Equity: "03",
    Revenue: "04",
    Expenses: "05"
};


/* =========================================================
   TEST API
========================================================= */

app.get("/api/test", async (req, res) => {

    try {

        const connection = await pool.getConnection();

        await connection.ping();

        connection.release();

        res.json({
            success: true,
            message: "NEURA server and MySQL are connected."
        });

    } catch (error) {

        console.error("DATABASE TEST ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to connect to MySQL."
        });

    }

});


/* =========================================================
   CHART OF ACCOUNTS - GET ALL
========================================================= */

app.get("/api/accounts", async (req, res) => {

    try {

        const [accounts] = await pool.execute(`
            SELECT
                account_id,
                account_code,
                account_name,
                account_type,
                created_at
            FROM chart_of_accounts
            ORDER BY account_code ASC
        `);

        res.json({
            success: true,
            accounts
        });

    } catch (error) {

        console.error("GET ACCOUNTS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve accounts."
        });

    }

});


/* =========================================================
   CHART OF ACCOUNTS - NEXT CODE
========================================================= */

app.get("/api/accounts/next-code/:type", async (req, res) => {

    try {

        const accountType = req.params.type;

        const prefix =
            accountTypePrefixes[accountType];

        if (!prefix) {

            return res.status(400).json({
                success: false,
                message: "Invalid Account Type."
            });

        }

        const [rows] = await pool.execute(
            `
            SELECT account_code
            FROM chart_of_accounts
            WHERE account_code LIKE ?
            `,
            [`${prefix}-%`]
        );

        let highestNumber = 1000;

        rows.forEach(row => {

            const match =
                String(row.account_code)
                    .match(/^(\d{2})-(\d{4})$/);

            if (!match) {
                return;
            }

            const codePrefix = match[1];
            const number = Number(match[2]);

            if (
                codePrefix === prefix &&
                Number.isInteger(number) &&
                number > highestNumber
            ) {
                highestNumber = number;
            }

        });

        const nextCode =
            `${prefix}-${highestNumber + 1}`;

        res.json({
            success: true,
            account_type: accountType,
            account_code: nextCode
        });

    } catch (error) {

        console.error(
            "NEXT ACCOUNT CODE ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to generate account code."
        });

    }

});


/* =========================================================
   CHART OF ACCOUNTS - CREATE
========================================================= */

app.post("/api/accounts", async (req, res) => {

    try {

        const {
            account_code,
            account_name,
            account_type
        } = req.body;

        if (
            !account_code ||
            !account_name ||
            !account_type
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Please complete all account fields."
            });

        }

        const expectedPrefix =
            accountTypePrefixes[account_type];

        if (!expectedPrefix) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid Account Type."
            });

        }

        const accountCodePattern =
            /^(01|02|03|04|05)-\d{4}$/;

        if (
            !accountCodePattern.test(
                account_code
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid Account Code format."
            });

        }

        const codePrefix =
            account_code.split("-")[0];

        if (
            codePrefix !== expectedPrefix
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `Invalid code for ${account_type}.`
            });

        }

        const [result] =
            await pool.execute(
                `
                INSERT INTO chart_of_accounts
                (
                    account_code,
                    account_name,
                    account_type
                )
                VALUES (?, ?, ?)
                `,
                [
                    account_code,
                    account_name.trim(),
                    account_type
                ]
            );

        res.status(201).json({
            success: true,
            message:
                "Account created successfully.",
            account: {
                account_id:
                    result.insertId,
                account_code,
                account_name:
                    account_name.trim(),
                account_type
            }
        });

    } catch (error) {

        if (
            error.code === "ER_DUP_ENTRY"
        ) {

            return res.status(409).json({
                success: false,
                message:
                    "This Account Code already exists."
            });

        }

        console.error(
            "CREATE ACCOUNT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to create account."
        });

    }

});


/* =========================================================
   CHART OF ACCOUNTS - DELETE
========================================================= */

app.delete("/api/accounts/:id", async (req, res) => {

    try {

        const accountId =
            Number(req.params.id);

        if (
            !Number.isInteger(accountId) ||
            accountId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid account ID."
            });

        }

        const [result] =
            await pool.execute(
                `
                DELETE FROM chart_of_accounts
                WHERE account_id = ?
                `,
                [accountId]
            );

        if (
            result.affectedRows === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Account not found."
            });

        }

        res.json({
            success: true,
            message:
                "Account deleted successfully."
        });

    } catch (error) {

        if (
            error.code ===
                "ER_ROW_IS_REFERENCED_2" ||
            error.code ===
                "ER_ROW_IS_REFERENCED"
        ) {

            return res.status(409).json({
                success: false,
                message:
                    "This account is already used by a transaction."
            });

        }

        console.error(
            "DELETE ACCOUNT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to delete account."
        });

    }

});


/* =========================================================
   PURCHASE BATCHES - GET
========================================================= */

app.get(
    "/api/purchase-batches",
    async (req, res) => {

        try {

            const [batches] =
                await pool.execute(`
                    SELECT
                        batch_id,
                        batch_code,
                        batch_name,
                        created_at
                    FROM purchase_batches
                    ORDER BY batch_code ASC
                `);

            res.json({
                success: true,
                batches
            });

        } catch (error) {

            console.error(
                "GET PURCHASE BATCHES ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to retrieve purchase batches."
            });

        }

    }
);


/* =========================================================
   PURCHASE BATCHES - CREATE
========================================================= */

app.post(
    "/api/purchase-batches",
    async (req, res) => {

        try {

            const batchCode =
                String(
                    req.body.batch_code || ""
                )
                    .trim()
                    .toUpperCase();

            const batchName =
                String(
                    req.body.batch_name || ""
                )
                    .trim()
                    .toUpperCase();

            if (
                !batchCode ||
                !batchName
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Batch Code and Batch Name are required."
                });

            }

            const [result] =
                await pool.execute(
                    `
                    INSERT INTO purchase_batches
                    (
                        batch_code,
                        batch_name
                    )
                    VALUES (?, ?)
                    `,
                    [
                        batchCode,
                        batchName
                    ]
                );

            res.status(201).json({
                success: true,
                message:
                    "Purchase batch created successfully.",
                batch: {
                    batch_id:
                        result.insertId,
                    batch_code:
                        batchCode,
                    batch_name:
                        batchName
                }
            });

        } catch (error) {

            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This Purchase Batch Code already exists."
                });

            }

            console.error(
                "CREATE PURCHASE BATCH ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to create purchase batch."
            });

        }

    }
);


/* =========================================================
   PURCHASE JOURNAL - GET
========================================================= */

app.get(
    "/api/purchase-journal",
    async (req, res) => {

        try {

            const [entries] =
                await pool.execute(`
                    SELECT
                        pje.entry_id,

                        DATE_FORMAT(
                            pje.entry_date,
                            '%Y-%m-%d'
                        ) AS entry_date,

                        pje.document_no,
                        pje.payee,
                        pje.particulars,
                        pje.business_activity,
                        pje.status,

                        pb.batch_id,
                        pb.batch_code,
                        pb.batch_name,

                        pjl.debit_amount,
                        pjl.credit_amount,

                        da.account_id
                            AS debit_account_id,

                        da.account_code
                            AS debit_account_code,

                        da.account_name
                            AS debit_account_name,

                        ca.account_id
                            AS credit_account_id,

                        ca.account_code
                            AS credit_account_code,

                        ca.account_name
                            AS credit_account_name

                    FROM purchase_journal_entries pje

                    INNER JOIN purchase_batches pb
                        ON pb.batch_id =
                            pje.batch_id

                    INNER JOIN purchase_journal_lines pjl
                        ON pjl.entry_id =
                            pje.entry_id

                    INNER JOIN chart_of_accounts da
                        ON da.account_id =
                            pjl.debit_account_id

                    INNER JOIN chart_of_accounts ca
                        ON ca.account_id =
                            pjl.credit_account_id

                    ORDER BY
                        pje.entry_date DESC,
                        pje.entry_id DESC
                `);

            res.json({
                success: true,
                entries
            });

        } catch (error) {

            console.error(
                "GET PURCHASE JOURNAL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to retrieve purchase journal entries."
            });

        }

    }
);


/* =========================================================
   PURCHASE JOURNAL - POST
========================================================= */

app.post(
    "/api/purchase-journal",
    async (req, res) => {

        let connection;

        try {

            const {
                batch_id,
                entry_date,
                document_no,
                payee,
                debit_account_id,
                debit_amount,
                credit_account_id,
                credit_amount,
                particulars,
                business_activity
            } = req.body;

            const batchId =
                Number(batch_id);

            const debitAccountId =
                Number(debit_account_id);

            const creditAccountId =
                Number(credit_account_id);

            const debitAmount =
                Number(debit_amount);

            const creditAmount =
                Number(credit_amount);

            if (
                !Number.isInteger(batchId) ||
                batchId <= 0 ||
                !entry_date ||
                !String(
                    document_no || ""
                ).trim() ||
                !String(
                    payee || ""
                ).trim() ||
                !Number.isInteger(
                    debitAccountId
                ) ||
                debitAccountId <= 0 ||
                !Number.isInteger(
                    creditAccountId
                ) ||
                creditAccountId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please complete all required purchase entry fields."
                });

            }

            if (
                !Number.isFinite(
                    debitAmount
                ) ||
                !Number.isFinite(
                    creditAmount
                ) ||
                debitAmount <= 0 ||
                creditAmount <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Debit and Credit amounts must be greater than zero."
                });

            }

            if (
                debitAccountId ===
                creditAccountId
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Debit and Credit accounts must be different."
                });

            }

            if (
                Math.abs(
                    debitAmount -
                    creditAmount
                ) >= 0.005
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Total Debit must equal Total Credit."
                });

            }

            connection =
                await pool.getConnection();

            await connection
                .beginTransaction();


            /* CHECK BATCH */

            const [batchRows] =
                await connection.execute(
                    `
                    SELECT batch_id
                    FROM purchase_batches
                    WHERE batch_id = ?
                    LIMIT 1
                    `,
                    [batchId]
                );

            if (
                batchRows.length === 0
            ) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        "Purchase batch not found."
                });

            }


            /* CHECK ACCOUNTS */

            const [accountRows] =
                await connection.execute(
                    `
                    SELECT account_id
                    FROM chart_of_accounts
                    WHERE account_id IN (?, ?)
                    `,
                    [
                        debitAccountId,
                        creditAccountId
                    ]
                );

            const validAccountIds =
                new Set(
                    accountRows.map(
                        row =>
                            Number(
                                row.account_id
                            )
                    )
                );

            if (
                !validAccountIds.has(
                    debitAccountId
                ) ||
                !validAccountIds.has(
                    creditAccountId
                )
            ) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        "One or more selected accounts do not exist."
                });

            }


            /* CREATE ENTRY */

            const [entryResult] =
                await connection.execute(
                    `
                    INSERT INTO
                        purchase_journal_entries
                    (
                        batch_id,
                        entry_date,
                        document_no,
                        payee,
                        particulars,
                        business_activity,
                        status
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'Posted'
                    )
                    `,
                    [
                        batchId,
                        entry_date,
                        String(
                            document_no
                        ).trim(),
                        String(
                            payee
                        ).trim(),
                        String(
                            particulars || ""
                        ).trim() || null,
                        String(
                            business_activity ||
                            ""
                        ).trim() || null
                    ]
                );


            /* CREATE LINE */

            await connection.execute(
                `
                INSERT INTO
                    purchase_journal_lines
                (
                    entry_id,
                    debit_account_id,
                    debit_amount,
                    credit_account_id,
                    credit_amount
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    entryResult.insertId,
                    debitAccountId,
                    debitAmount,
                    creditAccountId,
                    creditAmount
                ]
            );

            await connection.commit();

            res.status(201).json({
                success: true,
                message:
                    "Purchase journal entry posted successfully.",
                entry_id:
                    entryResult.insertId
            });

        } catch (error) {

            if (connection) {

                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "ROLLBACK ERROR:",
                        rollbackError
                    );
                }

            }

            console.error(
                "POST PURCHASE JOURNAL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to post purchase journal entry."
            });

        } finally {

            if (connection) {
                connection.release();
            }

        }

    }
);

/* =========================================================
   PURCHASE JOURNAL - CANCEL / VOID
========================================================= */

app.patch(
    "/api/purchase-journal/:id/cancel",
    async (req, res) => {

        try {

            const entryId =
                Number(
                    req.params.id
                );


            /* =============================================
               VALIDATE ID
            ============================================= */

            if (
                !Number.isInteger(
                    entryId
                ) ||
                entryId <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid purchase journal entry ID."

                    });

            }


            /* =============================================
               FIND ENTRY
            ============================================= */

            const [rows] =
                await pool.execute(
                    `

                        SELECT
                            entry_id,
                            document_no,
                            status

                        FROM
                            purchase_journal_entries

                        WHERE
                            entry_id = ?

                        LIMIT 1

                    `,
                    [
                        entryId
                    ]
                );


            if (
                rows.length ===
                0
            ) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "Purchase journal entry not found."

                    });

            }


            const entry =
                rows[0];


            /* =============================================
               ALREADY CANCELLED
            ============================================= */

            if (
                entry.status ===
                "Cancelled"
            ) {

                return res
                    .status(409)
                    .json({

                        success:
                            false,

                        message:
                            "This purchase journal entry is already cancelled."

                    });

            }


            /* =============================================
               ONLY POSTED ENTRY CAN BE CANCELLED
            ============================================= */

            if (
                entry.status !==
                "Posted"
            ) {

                return res
                    .status(409)
                    .json({

                        success:
                            false,

                        message:
                            "Only Posted purchase journal entries can be cancelled."

                    });

            }


            /* =============================================
               CANCEL ENTRY
            ============================================= */

            await pool.execute(
                `

                    UPDATE
                        purchase_journal_entries

                    SET
                        status = 'Cancelled'

                    WHERE
                        entry_id = ?

                `,
                [
                    entryId
                ]
            );


            res.json({

                success:
                    true,

                message:
                    "Purchase journal entry cancelled successfully.",

                entry: {

                    entry_id:
                        entryId,

                    document_no:
                        entry.document_no,

                    status:
                        "Cancelled"

                }

            });


        } catch (error) {

            console.error(
                "CANCEL PURCHASE JOURNAL ERROR:",
                error
            );


            res.status(500)
                .json({

                    success:
                        false,

                    message:
                        "Unable to cancel purchase journal entry."

                });

        }

    }
);

/* =========================================================
   SALES BATCHES - GET
========================================================= */

app.get(
    "/api/sales-batches",
    async (req, res) => {

        try {

            const [batches] =
                await pool.execute(`
                    SELECT
                        batch_id,
                        batch_code,
                        batch_name,
                        created_at
                    FROM sales_batches
                    ORDER BY batch_code ASC
                `);

            res.json({
                success: true,
                batches
            });

        } catch (error) {

            console.error(
                "GET SALES BATCHES ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to retrieve sales batches."
            });

        }

    }
);


/* =========================================================
   SALES BATCHES - CREATE
========================================================= */

app.post(
    "/api/sales-batches",
    async (req, res) => {

        try {

            const batchCode =
                String(
                    req.body.batch_code || ""
                )
                    .trim()
                    .toUpperCase();

            const batchName =
                String(
                    req.body.batch_name || ""
                )
                    .trim()
                    .toUpperCase();

            if (
                !batchCode ||
                !batchName
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Batch Code and Batch Name are required."
                });

            }

            const [result] =
                await pool.execute(
                    `
                    INSERT INTO sales_batches
                    (
                        batch_code,
                        batch_name
                    )
                    VALUES (?, ?)
                    `,
                    [
                        batchCode,
                        batchName
                    ]
                );

            res.status(201).json({
                success: true,
                message:
                    "Sales batch created successfully.",
                batch: {
                    batch_id:
                        result.insertId,
                    batch_code:
                        batchCode,
                    batch_name:
                        batchName
                }
            });

        } catch (error) {

            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This Sales Batch Code already exists."
                });

            }

            console.error(
                "CREATE SALES BATCH ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to create sales batch."
            });

        }

    }
);

/* =========================================================
   SALES JOURNAL - DOCUMENT NUMBER
========================================================= */

function getSalesDocumentPrefix(
    batchCode
) {

    const numberParts =
        String(
            batchCode || ""
        ).match(
            /\d+/g
        );


    if (
        numberParts &&
        numberParts.length
    ) {

        const lastNumber =
            Number(
                numberParts[
                    numberParts.length - 1
                ]
            );


        if (
            Number.isInteger(
                lastNumber
            ) &&
            lastNumber >= 1 &&
            lastNumber <= 99
        ) {

            return String(
                lastNumber
            ).padStart(
                2,
                "0"
            );

        }

    }


    return "01";

}


async function getNextSalesDocumentNumber(
    db,
    batchId,
    knownBatchCode = null
) {

    let batchCode =
        knownBatchCode;


    if (!batchCode) {

        const [batchRows] =
            await db.execute(
                `
                SELECT
                    batch_code
                FROM sales_batches
                WHERE batch_id = ?
                LIMIT 1
                `,
                [
                    batchId
                ]
            );


        if (
            batchRows.length === 0
        ) {

            return null;

        }


        batchCode =
            batchRows[0]
                .batch_code;

    }


    const prefix =
        getSalesDocumentPrefix(
            batchCode
        );


    const [rows] =
        await db.execute(
            `
            SELECT
                document_no
            FROM sales_journal_entries
            WHERE batch_id = ?
            `,
            [
                batchId
            ]
        );


    let highestNumber =
        0;


    const pattern =
        new RegExp(
            `^${prefix}-(\\d{4})$`
        );


    rows.forEach(
        row => {

            const match =
                String(
                    row.document_no ||
                    ""
                ).match(
                    pattern
                );


            if (!match) {

                return;

            }


            const number =
                Number(
                    match[1]
                );


            if (
                Number.isInteger(
                    number
                ) &&
                number >
                    highestNumber
            ) {

                highestNumber =
                    number;

            }

        }
    );


    return (
        `${prefix}-${String(
            highestNumber + 1
        ).padStart(
            4,
            "0"
        )}`
    );

}


/* =========================================================
   SALES JOURNAL - NEXT DOCUMENT
========================================================= */

app.get(
    "/api/sales-journal/next-document/:batchId",
    async (req, res) => {

        try {

            const batchId =
                Number(
                    req.params.batchId
                );


            if (
                !Number.isInteger(
                    batchId
                ) ||
                batchId <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid Sales Batch."

                    });

            }


            const documentNo =
                await getNextSalesDocumentNumber(
                    pool,
                    batchId
                );


            if (!documentNo) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "Sales Batch not found."

                    });

            }


            res.json({

                success:
                    true,

                document_no:
                    documentNo

            });


        } catch (error) {

            console.error(
                "NEXT SALES DOCUMENT ERROR:",
                error
            );


            res.status(500)
                .json({

                    success:
                        false,

                    message:
                        "Unable to generate Sales document number."

                });

        }

    }
);

/* =========================================================
   SALES JOURNAL - GET
========================================================= */

app.get(
    "/api/sales-journal",
    async (req, res) => {

        try {

            const [entries] =
                await pool.execute(`
                    SELECT

                        sje.entry_id,

                        DATE_FORMAT(
                            sje.entry_date,
                            '%Y-%m-%d'
                        ) AS entry_date,

                        sje.document_no,

                        sje.customer_name,

                        COALESCE(
                            sjl.particulars,
                            sje.particulars
                        ) AS particulars,

                        COALESCE(
                            sjl.business_activity,
                            sje.business_activity
                        ) AS business_activity,

                        sje.status,

                        sb.batch_id,
                        sb.batch_code,
                        sb.batch_name,

                        sjl.line_id,

                        sjl.debit_amount,
                        sjl.credit_amount,

                        da.account_id
                            AS debit_account_id,

                        da.account_code
                            AS debit_account_code,

                        da.account_name
                            AS debit_account_name,

                        ca.account_id
                            AS credit_account_id,

                        ca.account_code
                            AS credit_account_code,

                        ca.account_name
                            AS credit_account_name

                    FROM sales_journal_entries sje

                    INNER JOIN sales_batches sb
                        ON sb.batch_id =
                            sje.batch_id

                    INNER JOIN sales_journal_lines sjl
                        ON sjl.entry_id =
                            sje.entry_id

                    LEFT JOIN chart_of_accounts da
                        ON da.account_id =
                            sjl.debit_account_id

                    LEFT JOIN chart_of_accounts ca
                        ON ca.account_id =
                            sjl.credit_account_id

                    ORDER BY
                        sje.entry_date DESC,
                        sje.entry_id DESC,
                        sjl.line_id ASC
                `);


            res.json({

                success:
                    true,

                entries

            });


        } catch (error) {

            console.error(
                "GET SALES JOURNAL ERROR:",
                error
            );


            res.status(500)
                .json({

                    success:
                        false,

                    message:
                        "Unable to retrieve sales journal entries."

                });

        }

    }
);


/* =========================================================
   SALES JOURNAL - POST
   MULTI-LINE JOURNAL
========================================================= */

app.post(
    "/api/sales-journal",
    async (req, res) => {

        let connection;


        try {

            const {

                batch_id,

                entry_date,

                document_no,

                customer_name,

                lines

            } =
                req.body;


            const batchId =
                Number(
                    batch_id
                );


            /* =================================================
               HEADER VALIDATION
            ================================================= */

            if (
                !Number.isInteger(
                    batchId
                ) ||
                batchId <= 0 ||
                !entry_date ||
                !String(
                    document_no ||
                    ""
                ).trim() ||
                !String(
                    customer_name ||
                    ""
                ).trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Please complete Date, Document No., and Payee."

                    });

            }


            /* =================================================
               SUPPORT NEW MULTI-LINE FORMAT
               + OLD SINGLE-LINE FORMAT
            ================================================= */

            let rawLines;


            if (
                Array.isArray(
                    lines
                )
            ) {

                rawLines =
                    lines;

            } else {

                rawLines = [

                    {

                        debit_account_id:
                            req.body
                                .debit_account_id,

                        debit_amount:
                            req.body
                                .debit_amount,

                        credit_account_id:
                            req.body
                                .credit_account_id,

                        credit_amount:
                            req.body
                                .credit_amount,

                        particulars:
                            req.body
                                .particulars,

                        business_activity:
                            req.body
                                .business_activity

                    }

                ];

            }


            const journalLines =
                rawLines
                    .map(
                        line => {

                            const debitIdRaw =
                                line
                                    .debit_account_id;

                            const creditIdRaw =
                                line
                                    .credit_account_id;


                            return {

                                debit_account_id:
                                    debitIdRaw === null ||
                                    debitIdRaw === undefined ||
                                    debitIdRaw === ""
                                        ? null
                                        : Number(
                                            debitIdRaw
                                        ),

                                debit_amount:
                                    Number(
                                        line
                                            .debit_amount
                                    ) || 0,

                                credit_account_id:
                                    creditIdRaw === null ||
                                    creditIdRaw === undefined ||
                                    creditIdRaw === ""
                                        ? null
                                        : Number(
                                            creditIdRaw
                                        ),

                                credit_amount:
                                    Number(
                                        line
                                            .credit_amount
                                    ) || 0,

                                particulars:
                                    String(
                                        line
                                            .particulars ||
                                        ""
                                    ).trim(),

                                business_activity:
                                    String(
                                        line
                                            .business_activity ||
                                        ""
                                    ).trim()

                            };

                        }
                    )
                    .filter(
                        line =>

                            line
                                .debit_account_id !==
                                null ||

                            line
                                .credit_account_id !==
                                null ||

                            line
                                .debit_amount !==
                                0 ||

                            line
                                .credit_amount !==
                                0 ||

                            line
                                .particulars ||

                            line
                                .business_activity

                    );


            if (
                journalLines.length ===
                0
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Please enter at least one journal row."

                    });

            }


            /* =================================================
               LINE VALIDATION
            ================================================= */

            let totalDebit =
                0;

            let totalCredit =
                0;


            for (
                let index = 0;
                index <
                    journalLines.length;
                index++
            ) {

                const line =
                    journalLines[index];


                if (
                    line.debit_amount < 0 ||
                    line.credit_amount < 0
                ) {

                    return res
                        .status(400)
                        .json({

                            success:
                                false,

                            message:
                                `Row ${index + 1}: Amount cannot be negative.`

                        });

                }


                if (
                    line.debit_amount >
                    0
                ) {

                    if (
                        !Number.isInteger(
                            line
                                .debit_account_id
                        ) ||
                        line
                            .debit_account_id <=
                            0
                    ) {

                        return res
                            .status(400)
                            .json({

                                success:
                                    false,

                                message:
                                    `Row ${index + 1}: Select a Debit Account.`

                            });

                    }

                }


                if (
                    line.debit_account_id &&
                    line.debit_amount <= 0
                ) {

                    return res
                        .status(400)
                        .json({

                            success:
                                false,

                            message:
                                `Row ${index + 1}: Debit Amount is required.`

                        });

                }


                if (
                    line.credit_amount >
                    0
                ) {

                    if (
                        !Number.isInteger(
                            line
                                .credit_account_id
                        ) ||
                        line
                            .credit_account_id <=
                            0
                    ) {

                        return res
                            .status(400)
                            .json({

                                success:
                                    false,

                                message:
                                    `Row ${index + 1}: Select a Credit Account.`

                            });

                    }

                }


                if (
                    line.credit_account_id &&
                    line.credit_amount <= 0
                ) {

                    return res
                        .status(400)
                        .json({

                            success:
                                false,

                            message:
                                `Row ${index + 1}: Credit Amount is required.`

                        });

                }


                if (
                    line.debit_amount <= 0 &&
                    line.credit_amount <= 0
                ) {

                    return res
                        .status(400)
                        .json({

                            success:
                                false,

                            message:
                                `Row ${index + 1}: Enter a Debit or Credit Amount.`

                        });

                }


                if (
                    line
                        .debit_account_id &&
                    line
                        .credit_account_id &&
                    line
                        .debit_account_id ===
                    line
                        .credit_account_id
                ) {

                    return res
                        .status(400)
                        .json({

                            success:
                                false,

                            message:
                                `Row ${index + 1}: Debit and Credit Account cannot be the same.`

                        });

                }


                totalDebit +=
                    line.debit_amount;

                totalCredit +=
                    line.credit_amount;

            }


            /* =================================================
               BALANCE CHECK
            ================================================= */

            if (
                totalDebit <= 0 ||
                totalCredit <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Debit and Credit totals must be greater than zero."

                    });

            }


            if (
                Math.abs(
                    totalDebit -
                    totalCredit
                ) >=
                0.005
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Total Debit must equal Total Credit."

                    });

            }


            /* =================================================
               START TRANSACTION
            ================================================= */

            connection =
                await pool
                    .getConnection();


            await connection
                .beginTransaction();


            /* =================================================
               LOCK BATCH

               This prevents two document numbers being
               created at the same time.
            ================================================= */

            const [batchRows] =
                await connection
                    .execute(
                        `
                        SELECT
                            batch_id,
                            batch_code
                        FROM sales_batches
                        WHERE batch_id = ?
                        FOR UPDATE
                        `,
                        [
                            batchId
                        ]
                    );


            if (
                batchRows.length ===
                0
            ) {

                await connection
                    .rollback();


                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "Sales Batch not found."

                    });

            }


            /* =================================================
               VERIFY DOCUMENT NUMBER

               Example:
               Server expects 01-0001.

               Frontend cannot send 01-0002 until
               01-0001 already exists in MySQL.
            ================================================= */

            const expectedDocumentNo =
                await getNextSalesDocumentNumber(
                    connection,
                    batchId,
                    batchRows[0]
                        .batch_code
                );


            if (
                String(
                    document_no
                ).trim() !==
                expectedDocumentNo
            ) {

                await connection
                    .rollback();


                return res
                    .status(409)
                    .json({

                        success:
                            false,

                        message:
                            `Current active document is ${expectedDocumentNo}. Complete it first.`,

                        document_no:
                            expectedDocumentNo

                    });

            }


            /* =================================================
               CHECK ALL ACCOUNT IDS
            ================================================= */

            const accountIds =
                Array.from(
                    new Set(

                        journalLines
                            .flatMap(
                                line => [

                                    line
                                        .debit_account_id,

                                    line
                                        .credit_account_id

                                ]
                            )
                            .filter(
                                id =>
                                    Number.isInteger(
                                        id
                                    ) &&
                                    id > 0
                            )

                    )
                );


            if (
                accountIds.length ===
                0
            ) {

                await connection
                    .rollback();


                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "No valid accounts were selected."

                    });

            }


            const placeholders =
                accountIds
                    .map(
                        () => "?"
                    )
                    .join(
                        ", "
                    );


            const [accountRows] =
                await connection
                    .execute(
                        `
                        SELECT
                            account_id
                        FROM chart_of_accounts
                        WHERE account_id IN (${placeholders})
                        `,
                        accountIds
                    );


            const validIds =
                new Set(
                    accountRows.map(
                        row =>
                            Number(
                                row
                                    .account_id
                            )
                    )
                );


            const hasInvalidAccount =
                accountIds.some(
                    id =>
                        !validIds.has(
                            id
                        )
                );


            if (
                hasInvalidAccount
            ) {

                await connection
                    .rollback();


                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "One or more selected accounts do not exist."

                    });

            }


            /* =================================================
               ENTRY HEADER

               Keep first particulars/activity in header
               for backward compatibility.
            ================================================= */

            const firstParticulars =
                journalLines.find(
                    line =>
                        line.particulars
                )
                    ?.particulars ||
                null;


            const firstBusinessActivity =
                journalLines.find(
                    line =>
                        line.business_activity
                )
                    ?.business_activity ||
                null;


            const [entryResult] =
                await connection
                    .execute(
                        `
                        INSERT INTO
                            sales_journal_entries
                        (
                            batch_id,
                            entry_date,
                            document_no,
                            customer_name,
                            particulars,
                            business_activity,
                            status
                        )
                        VALUES
                        (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            'Posted'
                        )
                        `,
                        [

                            batchId,

                            entry_date,

                            String(
                                document_no
                            ).trim(),

                            String(
                                customer_name
                            ).trim(),

                            firstParticulars,

                            firstBusinessActivity

                        ]
                    );


            /* =================================================
               INSERT EVERY JOURNAL ROW
            ================================================= */

            for (
                const line
                of journalLines
            ) {

                await connection
                    .execute(
                        `
                        INSERT INTO
                            sales_journal_lines
                        (
                            entry_id,

                            debit_account_id,
                            debit_amount,

                            credit_account_id,
                            credit_amount,

                            particulars,
                            business_activity
                        )

                        VALUES
                        (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        `,
                        [

                            entryResult
                                .insertId,

                            line
                                .debit_account_id,

                            line
                                .debit_amount,

                            line
                                .credit_account_id,

                            line
                                .credit_amount,

                            line
                                .particulars ||
                                null,

                            line
                                .business_activity ||
                                null

                        ]
                    );

            }


            /* =================================================
               NEXT DOCUMENT

               Only calculated AFTER current document
               has been inserted.
            ================================================= */

            const nextDocument =
                await getNextSalesDocumentNumber(
                    connection,
                    batchId,
                    batchRows[0]
                        .batch_code
                );


            await connection
                .commit();


            res.status(201)
                .json({

                    success:
                        true,

                    message:
                        `${expectedDocumentNo} posted successfully.`,

                    entry_id:
                        entryResult
                            .insertId,

                    document_no:
                        expectedDocumentNo,

                    next_document:
                        nextDocument,

                    total_debit:
                        totalDebit,

                    total_credit:
                        totalCredit

                });


        } catch (error) {

            if (
                connection
            ) {

                try {

                    await connection
                        .rollback();

                } catch (
                    rollbackError
                ) {

                    console.error(
                        "SALES ROLLBACK ERROR:",
                        rollbackError
                    );

                }

            }


            console.error(
                "POST SALES JOURNAL ERROR:",
                error
            );


            res.status(500)
                .json({

                    success:
                        false,

                    message:
                        "Unable to post Sales Journal."

                });


        } finally {

            if (
                connection
            ) {

                connection.release();

            }

        }

    }
);


/* =========================================================
   SUPPLIERS - GET ALL
========================================================= */

app.get(
    "/api/suppliers",
    async (req, res) => {

        try {

            const [suppliers] =
                await pool.execute(`
                    SELECT
                        supplier_id,
                        supplier_code,
                        supplier_name,
                        supplier_address,
                        tin_number,
                        contact_person,
                        contact_number,
                        email,
                        supplier_type,
                        payment_terms,
                        status,
                        created_at
                    FROM suppliers
                    ORDER BY supplier_code ASC
                `);

            res.json({
                success: true,
                suppliers
            });

        } catch (error) {

            console.error(
                "GET SUPPLIERS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to retrieve suppliers."
            });

        }

    }
);


/* =========================================================
   SUPPLIERS - NEXT CODE
========================================================= */

app.get(
    "/api/suppliers/next-code",
    async (req, res) => {

        try {

            const [rows] =
                await pool.execute(`
                    SELECT supplier_code
                    FROM suppliers
                    WHERE supplier_code
                        LIKE 'SUP-%'
                `);

            let highestNumber = 0;

            rows.forEach(row => {

                const match =
                    String(
                        row.supplier_code ||
                        ""
                    )
                        .match(
                            /^SUP-(\d{4})$/
                        );

                if (!match) {
                    return;
                }

                const number =
                    Number(match[1]);

                if (
                    Number.isInteger(number) &&
                    number > highestNumber
                ) {

                    highestNumber =
                        number;

                }

            });

            const nextCode =
                `SUP-${String(
                    highestNumber + 1
                ).padStart(4, "0")}`;

            res.json({
                success: true,
                supplier_code:
                    nextCode
            });

        } catch (error) {

            console.error(
                "NEXT SUPPLIER CODE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to generate supplier code."
            });

        }

    }
);


/* =========================================================
   SUPPLIERS - CREATE
========================================================= */

app.post(
    "/api/suppliers",
    async (req, res) => {

        try {

            const supplierCode =
                String(
                    req.body.supplier_code ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            const supplierName =
                String(
                    req.body.supplier_name ||
                    ""
                ).trim();

            const supplierAddress =
                String(
                    req.body.supplier_address ||
                    ""
                ).trim() || null;

            const tinNumber =
                String(
                    req.body.tin_number ||
                    ""
                ).trim() || null;

            const contactPerson =
                String(
                    req.body.contact_person ||
                    ""
                ).trim() || null;

            const contactNumber =
                String(
                    req.body.contact_number ||
                    ""
                ).trim() || null;

            const email =
                String(
                    req.body.email ||
                    ""
                ).trim() || null;

            const supplierType =
                String(
                    req.body.supplier_type ||
                    ""
                ).trim() || null;

            const paymentTerms =
                String(
                    req.body.payment_terms ||
                    ""
                ).trim() || null;

            const status =
                String(
                    req.body.status ||
                    "Active"
                ).trim();

            if (
                !supplierCode ||
                !supplierName
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Supplier Code and Supplier Name are required."
                });

            }

            if (
                !/^SUP-\d{4}$/.test(
                    supplierCode
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid Supplier Code format."
                });

            }

            if (
                status !== "Active" &&
                status !== "Inactive"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid supplier status."
                });

            }

            const [result] =
                await pool.execute(
                    `
                    INSERT INTO suppliers
                    (
                        supplier_code,
                        supplier_name,
                        supplier_address,
                        tin_number,
                        contact_person,
                        contact_number,
                        email,
                        supplier_type,
                        payment_terms,
                        status
                    )
                    VALUES
                    (
                        ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?
                    )
                    `,
                    [
                        supplierCode,
                        supplierName,
                        supplierAddress,
                        tinNumber,
                        contactPerson,
                        contactNumber,
                        email,
                        supplierType,
                        paymentTerms,
                        status
                    ]
                );

            res.status(201).json({
                success: true,
                message:
                    "Supplier created successfully.",
                supplier: {
                    supplier_id:
                        result.insertId,
                    supplier_code:
                        supplierCode,
                    supplier_name:
                        supplierName,
                    supplier_address:
                        supplierAddress,
                    tin_number:
                        tinNumber,
                    contact_person:
                        contactPerson,
                    contact_number:
                        contactNumber,
                    email,
                    supplier_type:
                        supplierType,
                    payment_terms:
                        paymentTerms,
                    status
                }
            });

        } catch (error) {

            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This Supplier Code already exists."
                });

            }

            console.error(
                "CREATE SUPPLIER ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to create supplier."
            });

        }

    }
);

/* =========================================================
   SUPPLIERS - UPDATE
========================================================= */

app.put(
    "/api/suppliers/:id",
    async (req, res) => {

        try {

            const supplierId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    supplierId
                ) ||
                supplierId <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid supplier ID."

                    });

            }


            const supplierCode =
                String(
                    req.body.supplier_code ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            const supplierName =
                String(
                    req.body.supplier_name ||
                    ""
                )
                    .trim();


            const supplierAddress =
                String(
                    req.body.supplier_address ||
                    ""
                )
                    .trim();


            const tinNumber =
                String(
                    req.body.tin_number ||
                    ""
                )
                    .trim();


            const contactPerson =
                String(
                    req.body.contact_person ||
                    ""
                )
                    .trim();


            const contactNumber =
                String(
                    req.body.contact_number ||
                    ""
                )
                    .trim();


            const email =
                String(
                    req.body.email ||
                    ""
                )
                    .trim();


            const supplierType =
                String(
                    req.body.supplier_type ||
                    ""
                )
                    .trim();


            const paymentTerms =
                String(
                    req.body.payment_terms ||
                    "Cash"
                )
                    .trim();


            const status =
                String(
                    req.body.status ||
                    "Active"
                )
                    .trim();


            if (
                !supplierCode ||
                !supplierName
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Supplier Code and Supplier Name are required."

                    });

            }


            if (
                !/^SUP-\d{4}$/.test(
                    supplierCode
                )
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid Supplier Code format."

                    });

            }


            if (
                status !== "Active" &&
                status !== "Inactive"
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid supplier status."

                    });

            }


            const [result] =
                await pool.execute(
                    `

                        UPDATE suppliers

                        SET
                            supplier_code = ?,
                            supplier_name = ?,
                            supplier_address = ?,
                            tin_number = ?,
                            contact_person = ?,
                            contact_number = ?,
                            email = ?,
                            supplier_type = ?,
                            payment_terms = ?,
                            status = ?

                        WHERE
                            supplier_id = ?

                    `,
                    [

                        supplierCode,

                        supplierName,

                        supplierAddress ||
                            null,

                        tinNumber ||
                            null,

                        contactPerson ||
                            null,

                        contactNumber ||
                            null,

                        email ||
                            null,

                        supplierType ||
                            null,

                        paymentTerms ||
                            null,

                        status,

                        supplierId

                    ]
                );


            if (
                result.affectedRows ===
                0
            ) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "Supplier not found."

                    });

            }


            res.json({

                success:
                    true,

                message:
                    "Supplier updated successfully.",

                supplier: {

                    supplier_id:
                        supplierId,

                    supplier_code:
                        supplierCode,

                    supplier_name:
                        supplierName,

                    supplier_address:
                        supplierAddress ||
                        null,

                    tin_number:
                        tinNumber ||
                        null,

                    contact_person:
                        contactPerson ||
                        null,

                    contact_number:
                        contactNumber ||
                        null,

                    email:
                        email ||
                        null,

                    supplier_type:
                        supplierType ||
                        null,

                    payment_terms:
                        paymentTerms ||
                        null,

                    status:
                        status

                }

            });


        } catch (error) {


            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {

                return res
                    .status(409)
                    .json({

                        success:
                            false,

                        message:
                            "This Supplier Code already exists."

                    });

            }


            console.error(
                "UPDATE SUPPLIER ERROR:",
                error
            );


            res.status(500)
                .json({

                    success:
                        false,

                    message:
                        "Unable to update supplier."

                });

        }

    }
);

/* =========================================================
   SUPPLIERS - DELETE
========================================================= */

app.delete(
    "/api/suppliers/:id",
    async (req, res) => {

        try {

            const supplierId =
                Number(req.params.id);

            if (
                !Number.isInteger(
                    supplierId
                ) ||
                supplierId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid supplier ID."
                });

            }

            const [result] =
                await pool.execute(
                    `
                    DELETE FROM suppliers
                    WHERE supplier_id = ?
                    `,
                    [supplierId]
                );

            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Supplier not found."
                });

            }

            res.json({
                success: true,
                message:
                    "Supplier deleted successfully."
            });

        } catch (error) {

            if (
                error.code ===
                    "ER_ROW_IS_REFERENCED_2" ||
                error.code ===
                    "ER_ROW_IS_REFERENCED"
            ) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This supplier is already used by another transaction and cannot be deleted."
                });

            }

            console.error(
                "DELETE SUPPLIER ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to delete supplier."
            });

        }

    }
);

/* =========================================================
   CHART OF ACCOUNTS TABLE
========================================================= */

async function ensureChartOfAccountsTable() {

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS chart_of_accounts (
            account_id INT NOT NULL AUTO_INCREMENT,
            account_code VARCHAR(20) NOT NULL,
            account_name VARCHAR(150) NOT NULL,
            account_type ENUM(
                'Assets',
                'Liabilities',
                'Equity',
                'Revenue',
                'Expenses'
            ) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (account_id),
            UNIQUE KEY unique_account_code (account_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

}

/* =========================================================
   CORE NEURA TABLES
========================================================= */

async function ensureCoreTables() {

    const statements = [

        /* =================================================
           SUPPLIERS
        ================================================= */

        `
        CREATE TABLE IF NOT EXISTS suppliers (
            supplier_id INT NOT NULL AUTO_INCREMENT,
            supplier_code VARCHAR(20) NOT NULL,
            supplier_name VARCHAR(150) NOT NULL,
            supplier_address VARCHAR(255),
            tin_number VARCHAR(30),
            contact_person VARCHAR(150),
            contact_number VARCHAR(30),
            email VARCHAR(150),
            supplier_type VARCHAR(100),
            payment_terms VARCHAR(100),

            status ENUM(
                'Active',
                'Inactive'
            ) NOT NULL DEFAULT 'Active',

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (supplier_id),
            UNIQUE KEY unique_supplier_code (supplier_code)

        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,


        /* =================================================
           CUSTOMERS
        ================================================= */

        `
        CREATE TABLE IF NOT EXISTS customers (
            customer_id INT NOT NULL AUTO_INCREMENT,
            customer_code VARCHAR(20) NOT NULL,
            customer_name VARCHAR(150) NOT NULL,
            customer_address VARCHAR(255),
            tin_number VARCHAR(30),
            contact_person VARCHAR(150),
            contact_number VARCHAR(30),
            email VARCHAR(150),
            customer_type VARCHAR(100),
            payment_terms VARCHAR(100),

            status ENUM(
                'Active',
                'Inactive'
            ) NOT NULL DEFAULT 'Active',

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (customer_id),
            UNIQUE KEY unique_customer_code (customer_code)

        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,


        /* =================================================
           PURCHASE BATCHES
        ================================================= */

        `
        CREATE TABLE IF NOT EXISTS purchase_batches (
            batch_id INT NOT NULL AUTO_INCREMENT,
            batch_code VARCHAR(20) NOT NULL,
            batch_name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (batch_id),
            UNIQUE KEY unique_purchase_batch_code (batch_code)

        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,


        /* =================================================
           PURCHASE JOURNAL ENTRIES
        ================================================= */

        `
        CREATE TABLE IF NOT EXISTS purchase_journal_entries (
            entry_id INT NOT NULL AUTO_INCREMENT,
            batch_id INT NOT NULL,
            entry_date DATE NOT NULL,
            document_no VARCHAR(50) NOT NULL,
            payee VARCHAR(150) NOT NULL,
            particulars VARCHAR(255),
            business_activity VARCHAR(150),

            status ENUM(
                'Draft',
                'Posted',
                'Cancelled'
            ) NOT NULL DEFAULT 'Draft',

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (entry_id),

            CONSTRAINT fk_purchase_entry_batch
                FOREIGN KEY (batch_id)
                REFERENCES purchase_batches(batch_id)
                ON DELETE RESTRICT

        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,


        /* =================================================
           PURCHASE JOURNAL LINES
        ================================================= */

        `
        CREATE TABLE IF NOT EXISTS purchase_journal_lines (
            line_id INT NOT NULL AUTO_INCREMENT,
            entry_id INT NOT NULL,

            debit_account_id INT NOT NULL,
            debit_amount DECIMAL(15,2)
                NOT NULL DEFAULT 0.00,

            credit_account_id INT NOT NULL,
            credit_amount DECIMAL(15,2)
                NOT NULL DEFAULT 0.00,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (line_id),

            CONSTRAINT fk_purchase_line_entry
                FOREIGN KEY (entry_id)
                REFERENCES purchase_journal_entries(entry_id)
                ON DELETE CASCADE,

            CONSTRAINT fk_purchase_debit_account
                FOREIGN KEY (debit_account_id)
                REFERENCES chart_of_accounts(account_id)
                ON DELETE RESTRICT,

            CONSTRAINT fk_purchase_credit_account
                FOREIGN KEY (credit_account_id)
                REFERENCES chart_of_accounts(account_id)
                ON DELETE RESTRICT

        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `

    ];


    for (const statement of statements) {

        await pool.execute(
            statement
        );

    }

}

/* =========================================================
   SALES JOURNAL TABLES
========================================================= */

async function ensureSalesJournalTables() {

    const statements = [

        `
        CREATE TABLE IF NOT EXISTS sales_batches (

            batch_id INT NOT NULL AUTO_INCREMENT,

            batch_code VARCHAR(50)
                NOT NULL UNIQUE,

            batch_name VARCHAR(100)
                NOT NULL,

            created_at
                TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (batch_id)

        ) ENGINE=InnoDB
          DEFAULT CHARSET=utf8mb4
        `,


        `
        CREATE TABLE IF NOT EXISTS sales_journal_entries (

            entry_id INT
                NOT NULL
                AUTO_INCREMENT,

            batch_id INT
                NOT NULL,

            entry_date DATE
                NOT NULL,

            document_no VARCHAR(50)
                NOT NULL,

            customer_name VARCHAR(150)
                NOT NULL,

            particulars VARCHAR(255)
                DEFAULT NULL,

            business_activity VARCHAR(255)
                DEFAULT NULL,

            status VARCHAR(20)
                NOT NULL
                DEFAULT 'Posted',

            created_at
                TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (entry_id),

            KEY
                idx_sales_journal_entries_batch
                (batch_id),

            CONSTRAINT
                fk_sales_journal_entries_batch

                FOREIGN KEY
                    (batch_id)

                REFERENCES
                    sales_batches(batch_id)

                ON DELETE RESTRICT

        ) ENGINE=InnoDB
          DEFAULT CHARSET=utf8mb4
        `,


        `
        CREATE TABLE IF NOT EXISTS sales_journal_lines (

            line_id INT
                NOT NULL
                AUTO_INCREMENT,

            entry_id INT
                NOT NULL,

            debit_account_id INT
                NULL,

            debit_amount
                DECIMAL(15,2)
                NOT NULL
                DEFAULT 0.00,

            credit_account_id INT
                NULL,

            credit_amount
                DECIMAL(15,2)
                NOT NULL
                DEFAULT 0.00,

            particulars
                VARCHAR(255)
                DEFAULT NULL,

            business_activity
                VARCHAR(255)
                DEFAULT NULL,

            PRIMARY KEY (line_id),

            KEY
                idx_sales_journal_lines_entry
                (entry_id),

            CONSTRAINT
                fk_sales_journal_lines_entry

                FOREIGN KEY
                    (entry_id)

                REFERENCES
                    sales_journal_entries(entry_id)

                ON DELETE CASCADE,

            CONSTRAINT
                fk_sales_journal_lines_debit

                FOREIGN KEY
                    (debit_account_id)

                REFERENCES
                    chart_of_accounts(account_id)

                ON DELETE RESTRICT,

            CONSTRAINT
                fk_sales_journal_lines_credit

                FOREIGN KEY
                    (credit_account_id)

                REFERENCES
                    chart_of_accounts(account_id)

                ON DELETE RESTRICT

        ) ENGINE=InnoDB
          DEFAULT CHARSET=utf8mb4
        `

    ];


    for (
        const statement
        of statements
    ) {

        await pool.execute(
            statement
        );

    }


    /* =====================================================
       UPGRADE EXISTING SALES JOURNAL TABLE

       Existing database already has this table,
       so CREATE TABLE IF NOT EXISTS alone is not enough.
    ===================================================== */

    await pool.execute(`
        ALTER TABLE
            sales_journal_lines

        MODIFY COLUMN
            debit_account_id
            INT NULL,

        MODIFY COLUMN
            debit_amount
            DECIMAL(15,2)
            NOT NULL
            DEFAULT 0.00,

        MODIFY COLUMN
            credit_account_id
            INT NULL,

        MODIFY COLUMN
            credit_amount
            DECIMAL(15,2)
            NOT NULL
            DEFAULT 0.00
    `);


    /* =====================================================
       PARTICULARS COLUMN
    ===================================================== */

    const [particularColumns] =
        await pool.execute(`
            SHOW COLUMNS
            FROM sales_journal_lines
            LIKE 'particulars'
        `);


    if (
        particularColumns.length ===
        0
    ) {

        await pool.execute(`
            ALTER TABLE
                sales_journal_lines

            ADD COLUMN
                particulars
                VARCHAR(255)
                DEFAULT NULL
                AFTER credit_amount
        `);

    }


    /* =====================================================
       BUSINESS ACTIVITY COLUMN
    ===================================================== */

    const [businessColumns] =
        await pool.execute(`
            SHOW COLUMNS
            FROM sales_journal_lines
            LIKE 'business_activity'
        `);


    if (
        businessColumns.length ===
        0
    ) {

        await pool.execute(`
            ALTER TABLE
                sales_journal_lines

            ADD COLUMN
                business_activity
                VARCHAR(255)
                DEFAULT NULL
                AFTER particulars
        `);

    }

}


/* =========================================================
   CUSTOMERS - GET ALL
========================================================= */

app.get(
    "/api/customers",
    async (req, res) => {

        try {

            const [customers] =
                await pool.execute(`

                    SELECT
                        customer_id,
                        customer_code,
                        customer_name,
                        customer_address,
                        tin_number,
                        contact_person,
                        contact_number,
                        email,
                        customer_type,
                        payment_terms,
                        status,
                        created_at

                    FROM
                        customers

                    ORDER BY
                        customer_id DESC

                `);


            res.json({

                success: true,

                customers

            });


        } catch (error) {

            console.error(
                "GET CUSTOMERS ERROR:",
                error
            );


            res.status(500)
                .json({

                    success: false,

                    message:
                        "Unable to retrieve customers."

                });

        }

    }
);


/* =========================================================
   CUSTOMERS - NEXT CODE
========================================================= */

app.get(
    "/api/customers/next-code",
    async (req, res) => {

        try {

            const [rows] =
                await pool.execute(`

                    SELECT
                        customer_code

                    FROM
                        customers

                    WHERE
                        customer_code LIKE 'CUS-%'

                `);


            let highestNumber = 0;


            rows.forEach(row => {

                const match =
                    String(
                        row.customer_code || ""
                    )
                        .match(
                            /^CUS-(\d+)$/i
                        );


                if (!match) {
                    return;
                }


                const number =
                    Number(
                        match[1]
                    );


                if (
                    Number.isInteger(number) &&
                    number > highestNumber
                ) {

                    highestNumber =
                        number;

                }

            });


            const nextNumber =
                highestNumber + 1;


            const customerCode =
                `CUS-${String(
                    nextNumber
                ).padStart(
                    4,
                    "0"
                )}`;


            res.json({

                success: true,

                customer_code:
                    customerCode

            });


        } catch (error) {

            console.error(
                "NEXT CUSTOMER CODE ERROR:",
                error
            );


            res.status(500)
                .json({

                    success: false,

                    message:
                        "Unable to generate customer code."

                });

        }

    }
);


/* =========================================================
   CUSTOMERS - CREATE
========================================================= */

app.post(
    "/api/customers",
    async (req, res) => {

        try {

            const customerCode =
                String(
                    req.body.customer_code || ""
                )
                    .trim()
                    .toUpperCase();


            const customerName =
                String(
                    req.body.customer_name || ""
                )
                    .trim();


            const customerAddress =
                String(
                    req.body.customer_address || ""
                )
                    .trim();


            const tinNumber =
                String(
                    req.body.tin_number || ""
                )
                    .trim();


            const contactPerson =
                String(
                    req.body.contact_person || ""
                )
                    .trim();


            const contactNumber =
                String(
                    req.body.contact_number || ""
                )
                    .trim();


            const email =
                String(
                    req.body.email || ""
                )
                    .trim();


            const customerType =
                String(
                    req.body.customer_type || ""
                )
                    .trim();


            const paymentTerms =
                String(
                    req.body.payment_terms || "Cash"
                )
                    .trim();


            const status =
                String(
                    req.body.status || "Active"
                )
                    .trim();


            /* =============================================
               VALIDATION
            ============================================= */

            if (
                !customerCode ||
                !customerName
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Customer Code and Customer Name are required."

                    });

            }


            if (
                !/^CUS-\d{4,}$/.test(
                    customerCode
                )
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Invalid Customer Code."

                    });

            }


            if (
                status !== "Active" &&
                status !== "Inactive"
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Invalid customer status."

                    });

            }


            /* =============================================
               INSERT CUSTOMER
            ============================================= */

            const [result] =
                await pool.execute(
                    `

                        INSERT INTO customers (

                            customer_code,
                            customer_name,
                            customer_address,
                            tin_number,
                            contact_person,
                            contact_number,
                            email,
                            customer_type,
                            payment_terms,
                            status

                        )

                        VALUES (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?
                        )

                    `,
                    [

                        customerCode,
                        customerName,
                        customerAddress || null,
                        tinNumber || null,
                        contactPerson || null,
                        contactNumber || null,
                        email || null,
                        customerType || null,
                        paymentTerms || null,
                        status

                    ]
                );


            res.status(201)
                .json({

                    success: true,

                    message:
                        "Customer created successfully.",

                    customer_id:
                        result.insertId,

                    customer_code:
                        customerCode

                });


        } catch (error) {

            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {

                return res
                    .status(409)
                    .json({

                        success: false,

                        message:
                            "This Customer Code already exists."

                    });

            }


            console.error(
                "CREATE CUSTOMER ERROR:",
                error
            );


            res.status(500)
                .json({

                    success: false,

                    message:
                        "Unable to create customer."

                });

        }

    }
);

/* =========================================================
   CUSTOMERS - UPDATE
========================================================= */

app.put(
    "/api/customers/:id",
    async (req, res) => {

        try {

            const customerId =
                Number(
                    req.params.id
                );


            /* =============================================
               VALIDATE CUSTOMER ID
            ============================================= */

            if (
                !Number.isInteger(
                    customerId
                ) ||
                customerId <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid customer ID."

                    });

            }


            /* =============================================
               READ CUSTOMER DATA
            ============================================= */

            const customerCode =
                String(
                    req.body.customer_code ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            const customerName =
                String(
                    req.body.customer_name ||
                    ""
                )
                    .trim();


            const customerAddress =
                String(
                    req.body.customer_address ||
                    ""
                )
                    .trim();


            const tinNumber =
                String(
                    req.body.tin_number ||
                    ""
                )
                    .trim();


            const contactPerson =
                String(
                    req.body.contact_person ||
                    ""
                )
                    .trim();


            const contactNumber =
                String(
                    req.body.contact_number ||
                    ""
                )
                    .trim();


            const email =
                String(
                    req.body.email ||
                    ""
                )
                    .trim();


            const customerType =
                String(
                    req.body.customer_type ||
                    ""
                )
                    .trim();


            const paymentTerms =
                String(
                    req.body.payment_terms ||
                    "Cash"
                )
                    .trim();


            const status =
                String(
                    req.body.status ||
                    "Active"
                )
                    .trim();


            /* =============================================
               REQUIRED FIELDS
            ============================================= */

            if (
                !customerCode ||
                !customerName
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Customer Code and Customer Name are required."

                    });

            }


            /* =============================================
               CUSTOMER CODE FORMAT
            ============================================= */

            if (
                !/^CUS-\d{4,}$/.test(
                    customerCode
                )
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid Customer Code."

                    });

            }


            /* =============================================
               CUSTOMER STATUS
            ============================================= */

            if (
                status !==
                    "Active" &&
                status !==
                    "Inactive"
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid customer status."

                    });

            }


            /* =============================================
               UPDATE CUSTOMER
            ============================================= */

            const [result] =
                await pool.execute(
                    `

                        UPDATE customers

                        SET
                            customer_code = ?,
                            customer_name = ?,
                            customer_address = ?,
                            tin_number = ?,
                            contact_person = ?,
                            contact_number = ?,
                            email = ?,
                            customer_type = ?,
                            payment_terms = ?,
                            status = ?

                        WHERE
                            customer_id = ?

                    `,
                    [

                        customerCode,

                        customerName,

                        customerAddress ||
                            null,

                        tinNumber ||
                            null,

                        contactPerson ||
                            null,

                        contactNumber ||
                            null,

                        email ||
                            null,

                        customerType ||
                            null,

                        paymentTerms ||
                            null,

                        status,

                        customerId

                    ]
                );


            /* =============================================
               CUSTOMER NOT FOUND
            ============================================= */

            if (
                result.affectedRows ===
                0
            ) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "Customer not found."

                    });

            }


            /* =============================================
               SUCCESS
            ============================================= */

            res.json({

                success:
                    true,

                message:
                    "Customer updated successfully.",

                customer: {

                    customer_id:
                        customerId,

                    customer_code:
                        customerCode,

                    customer_name:
                        customerName,

                    customer_address:
                        customerAddress ||
                        null,

                    tin_number:
                        tinNumber ||
                        null,

                    contact_person:
                        contactPerson ||
                        null,

                    contact_number:
                        contactNumber ||
                        null,

                    email:
                        email ||
                        null,

                    customer_type:
                        customerType ||
                        null,

                    payment_terms:
                        paymentTerms ||
                        null,

                    status:
                        status

                }

            });


        } catch (error) {


            /* =============================================
               DUPLICATE CUSTOMER CODE
            ============================================= */

            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {

                return res
                    .status(409)
                    .json({

                        success:
                            false,

                        message:
                            "This Customer Code already exists."

                    });

            }


            console.error(
                "UPDATE CUSTOMER ERROR:",
                error
            );


            res.status(500)
                .json({

                    success:
                        false,

                    message:
                        "Unable to update customer."

                });

        }

    }
);

/* =========================================================
   CUSTOMERS - DELETE
========================================================= */

app.delete(
    "/api/customers/:id",
    async (req, res) => {

        try {

            const customerId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    customerId
                ) ||
                customerId <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Invalid customer ID."

                    });

            }


            const [result] =
                await pool.execute(
                    `

                        DELETE FROM
                            customers

                        WHERE
                            customer_id = ?

                    `,
                    [
                        customerId
                    ]
                );


            if (
                result.affectedRows === 0
            ) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Customer not found."

                    });

            }


            res.json({

                success: true,

                message:
                    "Customer deleted successfully."

            });


        } catch (error) {

            if (
                error.code ===
                "ER_ROW_IS_REFERENCED_2" ||
                error.code ===
                "ER_ROW_IS_REFERENCED"
            ) {

                return res
                    .status(409)
                    .json({

                        success: false,

                        message:
                            "This customer is already used by another transaction and cannot be deleted."

                    });

            }


            console.error(
                "DELETE CUSTOMER ERROR:",
                error
            );


            res.status(500)
                .json({

                    success: false,

                    message:
                        "Unable to delete customer."

                });

        }

    }
);

/* =========================================================
   SERVE FRONTEND
========================================================= */

app.use(
    express.static(
        path.join(__dirname)
    )
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(
    PORT,
    "0.0.0.0",
    async () => {

        console.log("");
        console.log(
            "=============================="
        );
        console.log(
            " NEURA ACCOUNTING SYSTEM"
        );
        console.log(
            "=============================="
        );

        console.log(
            `Server: http://localhost:${PORT}`
        );

        try {

            const connection =
                await pool.getConnection();

            await connection.ping();

            await ensureChartOfAccountsTable();

            await ensureCoreTables();

            await ensureSalesJournalTables();

            connection.release();

            console.log(
                "MySQL: Connected successfully"
            );

            console.log(
                `Database: ${process.env.DB_NAME}`
            );

        } catch (error) {

            console.error(
                "MySQL: Connection failed"
            );

            console.error(
                error.message
            );

        }

        console.log(
            "=============================="
        );

        console.log("");

    }
);