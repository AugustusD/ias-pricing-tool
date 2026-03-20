import * as XLSX from "xlsx";
import type { OrderItem } from "@/contexts/OrderContext";

export function exportToExcel(
  items: OrderItem[],
  getEffectivePrice: (item: OrderItem) => number,
  standardDiscount: number,
  infinityDiscount: number
) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows: (string | number)[][] = [
    ["Innovative Aluminum Systems - Dealer Order Summary"],
    [""],
    ["Date:", new Date().toLocaleDateString()],
    ["Standard Product Discount:", `${standardDiscount}%`],
    ["Infinity Product Discount:", `${infinityDiscount}%`],
    [""],
    ["Part Code", "Description", "Size", "Unit", "Qty", "Dealer Price", "Effective Price", "Line Total", "Type"],
  ];

  let grandTotal = 0;

  for (const item of items) {
    const effectivePrice = getEffectivePrice(item);
    const lineTotal = effectivePrice * item.quantity;
    grandTotal += lineTotal;

    summaryRows.push([
      item.partCode,
      item.description,
      item.size || "",
      item.unit,
      item.quantity,
      item.dealerPrice !== null ? item.dealerPrice : "N/A",
      item.isNetPrice ? "NET" : effectivePrice,
      lineTotal,
      item.isNetPrice ? "Net Price" : item.isInfinity ? "Infinity" : "Standard",
    ]);
  }

  summaryRows.push([""]);
  summaryRows.push(["", "", "", "", "", "", "GRAND TOTAL:", grandTotal, ""]);

  const ws = XLSX.utils.aoa_to_sheet(summaryRows);

  // Column widths
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

  XLSX.utils.book_append_sheet(wb, ws, "Order Summary");

  // Category breakdown sheets
  const byCategory = new Map<string, OrderItem[]>();
  for (const item of items) {
    const key = item.categoryName;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(item);
  }

  for (const [catName, catItems] of Array.from(byCategory.entries())) {
    const catRows: (string | number)[][] = [
      [catName],
      [""],
      ["Part Code", "Description", "Size", "Unit", "Qty", "Effective Price", "Line Total"],
    ];

    for (const item of catItems) {
      const effectivePrice = getEffectivePrice(item);
      const lineTotal = effectivePrice * item.quantity;
      catRows.push([
        item.partCode,
        item.description,
        item.size || "",
        item.unit,
        item.quantity,
        item.isNetPrice ? "NET" : effectivePrice,
        lineTotal,
      ]);
    }

    const catWs = XLSX.utils.aoa_to_sheet(catRows);
    catWs["!cols"] = [
      { wch: 22 }, { wch: 50 }, { wch: 12 }, { wch: 8 }, { wch: 6 }, { wch: 16 }, { wch: 14 },
    ];

    // Sanitize sheet name (max 31 chars, no special chars)
    const sheetName = catName.replace(/[\\/:*?[\]]/g, "").substring(0, 31);
    XLSX.utils.book_append_sheet(wb, catWs, sheetName);
  }

  XLSX.writeFile(wb, `IAS_Order_${new Date().toISOString().split("T")[0]}.xlsx`);
}

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
