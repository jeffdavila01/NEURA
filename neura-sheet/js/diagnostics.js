"use strict";

window.Neura-SheetDiagnostics = {
  findBalanceCandidates(ws, debitCol, creditCol, headerRow, range, difference) {
    const candidates = [];
    const target = Math.abs(difference);

    if (target < 0.005) return candidates;

    for (let r = headerRow + 1; r <= range.e.r; r++) {
      for (const col of [debitCol, creditCol]) {
        const address = XLSX.utils.encode_cell({ r, c: col });
        const cell = ws[address];

        if (!cell || typeof cell.v !== "number") continue;

        const amount = Math.abs(cell.v);

        if (Math.abs(amount - target) < 0.005) {
          candidates.push({
            row: r + 1,
            cell: address,
            amount,
            reason: "Amount matches the balance difference. Check for missing or incorrect counterpart entries."
          });
        }
      }
    }

    return candidates.slice(0, 25);
  }
};

