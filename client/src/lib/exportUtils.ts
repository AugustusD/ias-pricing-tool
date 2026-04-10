/**
 * IAS Excel Export Utility
 *
 * Produces a formula-driven workbook:
 *  - "Settings" sheet holds the two discount rates in named cells
 *  - "Order Summary" sheet references those cells via formulas
 *  - Effective Price column uses IF logic:
 *      Net items  → dealer price (no discount)
 *      Infinity   → dealer price × (1 - Infinity discount / 100)
 *      Standard   → dealer price × (1 - Standard discount / 100)
 *  - Line Total = Effective Price × Qty  (formula)
 *  - Grand Total = SUM(line totals)      (formula)
 *  - All dollar columns formatted as $#,##0.00
 *  - Per-category sheets mirror the same formula pattern
 */

import * as XLSX from "xlsx";
import type { OrderItem } from "@/contexts/OrderContext";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Convert 0-based column index to Excel letter(s): 0→A, 25→Z, 26→AA … */
function colLetter(idx: number): string {
  let s = "";
  let n = idx;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** Cell address string, e.g. cellAddr(0,0) → "A1" */
function cellAddr(col: number, row: number): string {
  return `${colLetter(col)}${row + 1}`;
}

/** Apply a number format to a range of cells in a worksheet */
function applyFmt(ws: XLSX.WorkSheet, fmt: string, col: number, rowStart: number, rowEnd: number) {
  for (let r = rowStart; r <= rowEnd; r++) {
    const addr = cellAddr(col, r);
    if (!ws[addr]) ws[addr] = { t: "n", v: 0 };
    if (!ws[addr].s) ws[addr].s = {};
    ws[addr].s.numFmt = fmt;
    ws[addr].z = fmt;
  }
}

/** Write a formula cell */
function fmtCell(formula: string, numFmt?: string): XLSX.CellObject {
  const cell: XLSX.CellObject = { t: "n", f: formula, v: 0 };
  if (numFmt) { cell.z = numFmt; if (!cell.s) cell.s = {}; (cell.s as any).numFmt = numFmt; }
  return cell;
}

/** Write a plain number cell with optional format */
function numCell(value: number, numFmt?: string): XLSX.CellObject {
  const cell: XLSX.CellObject = { t: "n", v: value };
  if (numFmt) { cell.z = numFmt; if (!cell.s) cell.s = {}; (cell.s as any).numFmt = numFmt; }
  return cell;
}

const DOLLAR_FMT = '$#,##0.00';

// ── main export ───────────────────────────────────────────────────────────────

export function exportToExcel(
  items: OrderItem[],
  _getEffectivePrice: (item: OrderItem) => number,
  standardDiscount: number,
  infinityDiscount: number
) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Settings ──────────────────────────────────────────────────────
  // Holds the two discount rates so all other sheets can reference them.
  // Standard discount → Settings!B2
  // Infinity discount → Settings!B3
  const settingsData: XLSX.CellObject[][] = [
    [{ t: "s", v: "IAS Discount Settings" }, { t: "s", v: "" }],
    [{ t: "s", v: "Standard Product Discount (%)" }, numCell(standardDiscount)],
    [{ t: "s", v: "Infinity Product Discount (%)" }, numCell(infinityDiscount)],
    [{ t: "s", v: "" }, { t: "s", v: "" }],
    [{ t: "s", v: "Note: Change these values to recalculate all sheets automatically." }, { t: "s", v: "" }],
  ];

  const settingsWs = XLSX.utils.aoa_to_sheet([]);
  // Write cells manually so we can control types
  settingsData.forEach((row, r) => {
    row.forEach((cell, c) => {
      settingsWs[cellAddr(c, r)] = cell;
    });
  });
  settingsWs["!ref"] = `A1:B${settingsData.length}`;
  settingsWs["!cols"] = [{ wch: 38 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, settingsWs, "Settings");

  // References to the discount cells on the Settings sheet
  const STD_DISC_REF = "Settings!$B$2";   // e.g. 45.75  (percent value)
  const INF_DISC_REF = "Settings!$B$3";

  // ── Sheet 2: Order Summary ─────────────────────────────────────────────────
  // Columns:
  //  A  Part Code
  //  B  Description
  //  C  Size
  //  D  Unit
  //  E  Qty
  //  F  Dealer Price
  //  G  Effective Price  ← formula
  //  H  Line Total       ← formula (G×E)
  //  I  Type

  const HEADER_ROW = 7;   // 0-based row index of the column header row (row 8 in Excel)
  const DATA_START  = 8;  // 0-based row index of first data row (row 9 in Excel)

  const summaryWs: XLSX.WorkSheet = {};

  // Title block (rows 1-6)
  summaryWs["A1"] = { t: "s", v: "Innovative Aluminum Systems – Dealer Order Summary" };
  summaryWs["A2"] = { t: "s", v: "" };
  summaryWs["A3"] = { t: "s", v: "Date:" };
  summaryWs["B3"] = { t: "s", v: new Date().toLocaleDateString() };
  summaryWs["A4"] = { t: "s", v: "Standard Product Discount:" };
  summaryWs["B4"] = fmtCell(`${STD_DISC_REF}/100`, "0.00%");
  summaryWs["A5"] = { t: "s", v: "Infinity Product Discount:" };
  summaryWs["B5"] = fmtCell(`${INF_DISC_REF}/100`, "0.00%");
  summaryWs["A6"] = { t: "s", v: "" };

  // Column headers (row HEADER_ROW+1 in Excel)
  const headers = ["Part Code","Description","Size","Unit","Qty","Dealer Price","Effective Price","Line Total","Type"];
  headers.forEach((h, c) => {
    summaryWs[cellAddr(c, HEADER_ROW)] = { t: "s", v: h };
  });

  // Data rows
  const dataRowCount = items.length;
  items.forEach((item, i) => {
    const r = DATA_START + i;           // 0-based
    const excelRow = r + 1;             // 1-based (for formula strings)

    const dealerPrice = item.dealerPrice ?? 0;

    // A: Part Code
    summaryWs[cellAddr(0, r)] = { t: "s", v: item.partCode };
    // B: Description
    summaryWs[cellAddr(1, r)] = { t: "s", v: item.description || "" };
    // C: Size
    summaryWs[cellAddr(2, r)] = { t: "s", v: item.size || "" };
    // D: Unit
    summaryWs[cellAddr(3, r)] = { t: "s", v: item.unit };
    // E: Qty
    summaryWs[cellAddr(4, r)] = { t: "n", v: item.quantity };
    // F: Dealer Price
    summaryWs[cellAddr(5, r)] = numCell(dealerPrice, DOLLAR_FMT);

    // G: Effective Price formula
    // Net items  → F (no discount)
    // Infinity   → F * (1 - Settings!$B$3/100)
    // Standard   → F * (1 - Settings!$B$2/100)
    let effectiveFormula: string;
    if (item.isNetPrice) {
      effectiveFormula = `F${excelRow}`;
    } else if (item.isInfinity) {
      effectiveFormula = `F${excelRow}*(1-${INF_DISC_REF}/100)`;
    } else {
      effectiveFormula = `F${excelRow}*(1-${STD_DISC_REF}/100)`;
    }
    summaryWs[cellAddr(6, r)] = fmtCell(effectiveFormula, DOLLAR_FMT);

    // H: Line Total = G * E
    summaryWs[cellAddr(7, r)] = fmtCell(`G${excelRow}*E${excelRow}`, DOLLAR_FMT);

    // I: Type label
    const typeLabel = item.isNetPrice ? "Net Price" : item.isInfinity ? "Infinity" : "Standard";
    summaryWs[cellAddr(8, r)] = { t: "s", v: typeLabel };
  });

  // Grand Total row
  const totalRow0 = DATA_START + dataRowCount + 1; // blank gap row
  const totalRow  = totalRow0 + 1;
  const totalExcel = totalRow + 1;
  const dataStartExcel = DATA_START + 1;
  const dataEndExcel   = DATA_START + dataRowCount;

  summaryWs[cellAddr(6, totalRow)] = { t: "s", v: "GRAND TOTAL:" };
  summaryWs[cellAddr(7, totalRow)] = fmtCell(
    `SUM(H${dataStartExcel}:H${dataEndExcel})`,
    DOLLAR_FMT
  );

  // Sheet ref
  summaryWs["!ref"] = `A1:I${totalExcel}`;
  summaryWs["!cols"] = [
    { wch: 22 }, // A Part Code
    { wch: 50 }, // B Description
    { wch: 12 }, // C Size
    { wch: 8  }, // D Unit
    { wch: 6  }, // E Qty
    { wch: 16 }, // F Dealer Price
    { wch: 18 }, // G Effective Price
    { wch: 16 }, // H Line Total
    { wch: 12 }, // I Type
  ];

  XLSX.utils.book_append_sheet(wb, summaryWs, "Order Summary");

  // ── Per-category sheets ────────────────────────────────────────────────────
  // Columns: A Part Code | B Description | C Size | D Unit | E Qty | F Dealer Price | G Effective Price | H Line Total
  const byCategory = new Map<string, OrderItem[]>();
  for (const item of items) {
    if (!byCategory.has(item.categoryName)) byCategory.set(item.categoryName, []);
    byCategory.get(item.categoryName)!.push(item);
  }

  const CAT_HDR = 1;   // 0-based header row
  const CAT_DATA = 2;  // 0-based first data row

  for (const [catName, catItems] of Array.from(byCategory.entries())) {
    const cws: XLSX.WorkSheet = {};

    // Title
    cws["A1"] = { t: "s", v: catName };

    // Headers
    const catHeaders = ["Part Code","Description","Size","Unit","Qty","Dealer Price","Effective Price","Line Total"];
    catHeaders.forEach((h, c) => { cws[cellAddr(c, CAT_HDR)] = { t: "s", v: h }; });

    catItems.forEach((item, i) => {
      const r = CAT_DATA + i;
      const excelRow = r + 1;
      const dealerPrice = item.dealerPrice ?? 0;

      cws[cellAddr(0, r)] = { t: "s", v: item.partCode };
      cws[cellAddr(1, r)] = { t: "s", v: item.description || "" };
      cws[cellAddr(2, r)] = { t: "s", v: item.size || "" };
      cws[cellAddr(3, r)] = { t: "s", v: item.unit };
      cws[cellAddr(4, r)] = { t: "n", v: item.quantity };
      cws[cellAddr(5, r)] = numCell(dealerPrice, DOLLAR_FMT);

      let effFormula: string;
      if (item.isNetPrice) {
        effFormula = `F${excelRow}`;
      } else if (item.isInfinity) {
        effFormula = `F${excelRow}*(1-${INF_DISC_REF}/100)`;
      } else {
        effFormula = `F${excelRow}*(1-${STD_DISC_REF}/100)`;
      }
      cws[cellAddr(6, r)] = fmtCell(effFormula, DOLLAR_FMT);
      cws[cellAddr(7, r)] = fmtCell(`G${excelRow}*E${excelRow}`, DOLLAR_FMT);
    });

    // Subtotal row
    const subTotalRow0 = CAT_DATA + catItems.length;
    const subTotalRow  = subTotalRow0 + 1;
    const catDataStart = CAT_DATA + 1;
    const catDataEnd   = CAT_DATA + catItems.length;

    cws[cellAddr(6, subTotalRow)] = { t: "s", v: "SUBTOTAL:" };
    cws[cellAddr(7, subTotalRow)] = fmtCell(
      `SUM(H${catDataStart}:H${catDataEnd})`,
      DOLLAR_FMT
    );

    cws["!ref"] = `A1:H${subTotalRow + 1}`;
    cws["!cols"] = [
      { wch: 22 }, { wch: 50 }, { wch: 12 }, { wch: 8 },
      { wch: 6  }, { wch: 16 }, { wch: 18 }, { wch: 16 },
    ];

    const sheetName = catName.replace(/[\\/:*?[\]]/g, "").substring(0, 31);
    XLSX.utils.book_append_sheet(wb, cws, sheetName);
  }

  XLSX.writeFile(wb, `IAS_Order_${new Date().toISOString().split("T")[0]}.xlsx`);
}

// ── Email body (unchanged) ────────────────────────────────────────────────────

export function generateEmailBody(
  items: OrderItem[],
  getEffectivePrice: (item: OrderItem) => number,
  standardDiscount: number,
  infinityDiscount: number
): string {
  const date = new Date().toLocaleDateString();
  let body = `Innovative Aluminum Systems - Order Inquiry\n`;
  body += `Date: ${date}\n`;
  body += `Standard Discount: ${standardDiscount}% | Infinity Discount: ${infinityDiscount}%\n\n`;
  body += `${"Part Code".padEnd(22)}${"Description".padEnd(45)}${"Size".padEnd(12)}${"Unit".padEnd(8)}${"Qty".padEnd(6)}${"Price".padEnd(14)}${"Total"}\n`;
  body += "-".repeat(110) + "\n";

  let grandTotal = 0;

  for (const item of items) {
    const effectivePrice = getEffectivePrice(item);
    const lineTotal = effectivePrice * item.quantity;
    grandTotal += lineTotal;

    const priceStr = item.isNetPrice ? "NET" : `$${effectivePrice.toFixed(2)}`;
    const totalStr = `$${lineTotal.toFixed(2)}`;

    body += `${item.partCode.padEnd(22)}${(item.description || "").substring(0, 44).padEnd(45)}${(item.size || "").padEnd(12)}${item.unit.padEnd(8)}${String(item.quantity).padEnd(6)}${priceStr.padEnd(14)}${totalStr}\n`;
  }

  body += "-".repeat(110) + "\n";
  body += `${"".padEnd(22 + 45 + 12 + 8 + 6 + 14)}GRAND TOTAL: $${grandTotal.toFixed(2)}\n`;

  return body;
}
