import * as XLSX from "xlsx";
import type { OrderItem } from "@/contexts/OrderContext";

/**
 * Returns a clean display value for the Size field.
 * Single lowercase letters (a–n) are placeholder codes from the source data
 * and should be shown as blank in all outputs.
 */
export function cleanSize(size: string | null | undefined): string {
  if (!size) return "";
  // Blank out single-letter placeholder codes (a, b, c … n)
  if (/^[a-zA-Z]$/.test(size.trim())) return "";
  // Also blank out bare dash
  if (size.trim() === "-") return "";
  return size;
}

export function exportToExcel(
  items: OrderItem[],
  getEffectivePrice: (item: OrderItem) => number,
  standardDiscount: number,
  infinityDiscount: number
) {
  const wb = XLSX.utils.book_new();
  const DOLLAR_FMT = "$#,##0.00";

  // Single sheet — all ordered items in one flat list
  const rows: (string | number)[][] = [
    ["Innovative Aluminum Systems - Dealer Order Summary"],
    [""],
    ["Date:", new Date().toLocaleDateString()],
    ["Standard Product Discount:", `${standardDiscount}%`],
    ["Infinity Product Discount:", `${infinityDiscount}%`],
    [""],
    [
      "Part Code",
      "Description",
      "Size",
      "Unit",
      "Qty",
      "Dealer Price",
      "Effective Price",
      "Line Total",
      "Type",
    ],
  ];

  let grandTotal = 0;

  for (const item of items) {
    const effectivePrice = getEffectivePrice(item);
    const lineTotal = effectivePrice * item.quantity;
    grandTotal += lineTotal;

    rows.push([
      item.partCode,
      item.description ?? "",
      cleanSize(item.size),
      item.unit,
      item.quantity,
      item.dealerPrice !== null ? item.dealerPrice : "N/A",
      item.isNetPrice ? "NET" : effectivePrice,
      lineTotal,
      item.isNetPrice ? "Net Price" : item.isInfinity ? "Infinity" : "Standard",
    ]);
  }

  rows.push([""]);
  rows.push(["", "", "", "", "", "", "GRAND TOTAL:", grandTotal, ""]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Apply $#,##0.00 format to Dealer Price (F), Effective Price (G), Line Total (H)
  // Header is row 7 (1-based), data starts at row 8
  const DATA_START = 8; // first data row (1-based Excel)
  items.forEach((_, i) => {
    const r = DATA_START + i;
    // Dealer Price – column F (index 5)
    if (ws[`F${r}`] && ws[`F${r}`].t === "n") ws[`F${r}`].z = DOLLAR_FMT;
    // Effective Price – column G (index 6): only when numeric (not "NET" string)
    if (ws[`G${r}`] && ws[`G${r}`].t === "n") ws[`G${r}`].z = DOLLAR_FMT;
    // Line Total – column H (index 7)
    if (ws[`H${r}`] && ws[`H${r}`].t === "n") ws[`H${r}`].z = DOLLAR_FMT;
  });
  // Grand Total row: 2 rows after last data row (blank + total)
  const grandTotalRow = DATA_START + items.length + 1;
  if (ws[`H${grandTotalRow}`]) ws[`H${grandTotalRow}`].z = DOLLAR_FMT;

  ws["!cols"] = [
    { wch: 22 }, // Part Code
    { wch: 50 }, // Description
    { wch: 12 }, // Size
    { wch: 8 },  // Unit
    { wch: 6 },  // Qty
    { wch: 14 }, // Dealer Price
    { wch: 16 }, // Effective Price
    { wch: 14 }, // Line Total
    { wch: 12 }, // Type
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Order");

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
    const sizeStr = cleanSize(item.size);

    body += `${item.partCode.padEnd(22)}${(item.description || "").substring(0, 44).padEnd(45)}${sizeStr.padEnd(12)}${item.unit.padEnd(8)}${String(item.quantity).padEnd(6)}${priceStr.padEnd(14)}${totalStr}\n`;
  }

  body += "-".repeat(110) + "\n";
  body += `${"".padEnd(22 + 45 + 12 + 8 + 6 + 14)}GRAND TOTAL: $${grandTotal.toFixed(2)}\n`;

  return body;
}
