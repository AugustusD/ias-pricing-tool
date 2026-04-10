/**
 * IAS Excel Export Utility
 *
 * Strategy: use XLSX.utils.aoa_to_sheet() to lay down ALL data (text + numbers)
 * reliably, then overwrite specific cells with formula objects.
 * This guarantees product rows are never empty.
 *
 * Workbook structure:
 *  Sheet 1 – "Settings"      : Standard % in B2, Infinity % in B3
 *  Sheet 2 – "Order Summary" : All items; Effective Price & Line Total are formulas
 *  Sheet 3+ – per category   : Same formula pattern + SUBTOTAL row
 *
 * Formula rules:
 *  Net items   → Effective Price = Dealer Price  (no discount)
 *  Infinity    → Effective Price = Dealer Price × (1 − Settings!$B$3/100)
 *  Standard    → Effective Price = Dealer Price × (1 − Settings!$B$2/100)
 *  Line Total  = Effective Price × Qty
 *  Grand Total = SUM(line total range)
 *
 * All $ columns formatted as $#,##0.00
 */

import * as XLSX from "xlsx";
import type { OrderItem } from "@/contexts/OrderContext";

const DOLLAR_FMT = "$#,##0.00";
const STD_REF    = "Settings!$B$2";   // Standard discount % cell
const INF_REF    = "Settings!$B$3";   // Infinity discount % cell

/** Apply number format to a single cell (creates cell if missing) */
function applyDollarFmt(ws: XLSX.WorkSheet, addr: string) {
  if (!ws[addr]) return;
  ws[addr].z = DOLLAR_FMT;
  if (!ws[addr].s) ws[addr].s = {};
  (ws[addr].s as Record<string, unknown>).numFmt = DOLLAR_FMT;
}

/** Overwrite a cell with a formula, preserving a static fallback value */
function setFormula(ws: XLSX.WorkSheet, addr: string, formula: string, fallback: number, fmt?: string) {
  ws[addr] = { t: "n", f: formula, v: fallback };
  if (fmt) {
    ws[addr].z = fmt;
    if (!ws[addr].s) ws[addr].s = {};
    (ws[addr].s as Record<string, unknown>).numFmt = fmt;
  }
}

export function exportToExcel(
  items: OrderItem[],
  getEffectivePrice: (item: OrderItem) => number,
  standardDiscount: number,
  infinityDiscount: number
) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Settings ──────────────────────────────────────────────────────
  const settingsAoa: (string | number)[][] = [
    ["IAS Discount Settings", ""],
    ["Standard Product Discount (%)", standardDiscount],
    ["Infinity Product Discount (%)", infinityDiscount],
    ["", ""],
    ["Change B2 / B3 to recalculate all sheets automatically.", ""],
  ];
  const settingsWs = XLSX.utils.aoa_to_sheet(settingsAoa);
  settingsWs["!cols"] = [{ wch: 42 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, settingsWs, "Settings");

  // ── Sheet 2: Order Summary ─────────────────────────────────────────────────
  // Build a plain AOA first (all static values), then overwrite formula cells.
  //
  // Row layout (1-based Excel rows):
  //   1  Title
  //   2  (blank)
  //   3  Date
  //   4  Standard discount label + value
  //   5  Infinity discount label + value
  //   6  (blank)
  //   7  (blank)
  //   8  Column headers
  //   9… data rows
  //   last+1  (blank)
  //   last+2  Grand Total row

  const TITLE_ROWS = 7;          // rows before header (0-based: rows 0-6)
  const HEADER_ROW_0 = 7;        // 0-based index of header row  → Excel row 8
  const DATA_START_0 = 8;        // 0-based index of first data row → Excel row 9

  // Pre-calculate effective prices for fallback values
  const effectivePrices = items.map((item) => getEffectivePrice(item));

  // Build AOA
  const summaryAoa: (string | number | null)[][] = [
    ["Innovative Aluminum Systems – Dealer Order Summary", null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    ["Date:", new Date().toLocaleDateString(), null, null, null, null, null, null, null],
    ["Standard Product Discount:", `${standardDiscount}%`, null, null, null, null, null, null, null],
    ["Infinity Product Discount:", `${infinityDiscount}%`, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    // Header row (index 7)
    ["Part Code", "Description", "Size", "Unit", "Qty", "Dealer Price", "Effective Price", "Line Total", "Type"],
  ];

  // Data rows
  items.forEach((item, i) => {
    const ep = effectivePrices[i];
    const lineTotal = ep * item.quantity;
    const typeLabel = item.isNetPrice ? "Net Price" : item.isInfinity ? "Infinity" : "Standard";
    summaryAoa.push([
      item.partCode,
      item.description || "",
      item.size || "",
      item.unit,
      item.quantity,
      item.dealerPrice ?? 0,   // F – Dealer Price (static, formula references this)
      ep,                       // G – Effective Price (will be overwritten with formula)
      lineTotal,                // H – Line Total (will be overwritten with formula)
      typeLabel,
    ]);
  });

  // Blank + Grand Total rows
  summaryAoa.push([null, null, null, null, null, null, null, null, null]);
  const grandTotal = effectivePrices.reduce((s, ep, i) => s + ep * items[i].quantity, 0);
  summaryAoa.push([null, null, null, null, null, null, "GRAND TOTAL:", grandTotal, null]);

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryAoa);

  // Now overwrite formula cells
  items.forEach((item, i) => {
    const excelRow = DATA_START_0 + i + 1;   // 1-based Excel row number
    const ep = effectivePrices[i];
    const lineTotal = ep * item.quantity;

    // G: Effective Price formula
    let effFormula: string;
    if (item.isNetPrice) {
      effFormula = `F${excelRow}`;
    } else if (item.isInfinity) {
      effFormula = `F${excelRow}*(1-${INF_REF}/100)`;
    } else {
      effFormula = `F${excelRow}*(1-${STD_REF}/100)`;
    }
    setFormula(summaryWs, `G${excelRow}`, effFormula, ep, DOLLAR_FMT);

    // H: Line Total formula
    setFormula(summaryWs, `H${excelRow}`, `G${excelRow}*E${excelRow}`, lineTotal, DOLLAR_FMT);

    // F: Dealer Price – just format
    applyDollarFmt(summaryWs, `F${excelRow}`);
  });

  // Grand Total formula (SUM)
  const dataStartExcel = DATA_START_0 + 1;
  const dataEndExcel   = DATA_START_0 + items.length;
  const grandTotalRow  = DATA_START_0 + items.length + 2 + 1; // +1 blank, +1 total, +1 for 1-based
  setFormula(summaryWs, `H${grandTotalRow}`, `SUM(H${dataStartExcel}:H${dataEndExcel})`, grandTotal, DOLLAR_FMT);

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
  const CAT_HDR_0  = 1;   // 0-based header row (row 2 in Excel, row 1 is category name)
  const CAT_DATA_0 = 2;   // 0-based first data row (row 3 in Excel)

  const byCategory = new Map<string, OrderItem[]>();
  for (const item of items) {
    if (!byCategory.has(item.categoryName)) byCategory.set(item.categoryName, []);
    byCategory.get(item.categoryName)!.push(item);
  }

  for (const [catName, catItems] of Array.from(byCategory.entries())) {
    const catEffPrices = catItems.map((item) => getEffectivePrice(item));

    const catAoa: (string | number | null)[][] = [
      [catName, null, null, null, null, null, null, null],
      ["Part Code", "Description", "Size", "Unit", "Qty", "Dealer Price", "Effective Price", "Line Total"],
    ];

    catItems.forEach((item, i) => {
      const ep = catEffPrices[i];
      catAoa.push([
        item.partCode,
        item.description || "",
        item.size || "",
        item.unit,
        item.quantity,
        item.dealerPrice ?? 0,
        ep,
        ep * item.quantity,
      ]);
    });

    // Blank + Subtotal
    catAoa.push([null, null, null, null, null, null, null, null]);
    const catSubtotal = catEffPrices.reduce((s, ep, i) => s + ep * catItems[i].quantity, 0);
    catAoa.push([null, null, null, null, null, null, "SUBTOTAL:", catSubtotal]);

    const cws = XLSX.utils.aoa_to_sheet(catAoa);

    // Overwrite formula cells
    catItems.forEach((item, i) => {
      const excelRow = CAT_DATA_0 + i + 1;   // 1-based
      const ep = catEffPrices[i];
      const lineTotal = ep * item.quantity;

      let effFormula: string;
      if (item.isNetPrice) {
        effFormula = `F${excelRow}`;
      } else if (item.isInfinity) {
        effFormula = `F${excelRow}*(1-${INF_REF}/100)`;
      } else {
        effFormula = `F${excelRow}*(1-${STD_REF}/100)`;
      }
      setFormula(cws, `G${excelRow}`, effFormula, ep, DOLLAR_FMT);
      setFormula(cws, `H${excelRow}`, `G${excelRow}*E${excelRow}`, lineTotal, DOLLAR_FMT);
      applyDollarFmt(cws, `F${excelRow}`);
    });

    // Subtotal formula
    const catDataStart = CAT_DATA_0 + 1;
    const catDataEnd   = CAT_DATA_0 + catItems.length;
    const subtotalRow  = CAT_DATA_0 + catItems.length + 2;   // 1-based
    setFormula(cws, `H${subtotalRow}`, `SUM(H${catDataStart}:H${catDataEnd})`, catSubtotal, DOLLAR_FMT);

    cws["!cols"] = [
      { wch: 22 }, { wch: 50 }, { wch: 12 }, { wch: 8 },
      { wch: 6  }, { wch: 16 }, { wch: 18 }, { wch: 16 },
    ];

    const sheetName = catName.replace(/[\\/:*?[\]]/g, "").substring(0, 31);
    XLSX.utils.book_append_sheet(wb, cws, sheetName);
  }

  XLSX.writeFile(wb, `IAS_Order_${new Date().toISOString().split("T")[0]}.xlsx`);
}

// ── Email body ────────────────────────────────────────────────────────────────

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
