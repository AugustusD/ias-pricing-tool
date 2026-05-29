/**
 * IAS EmailPreviewModal
 * Shows a formatted HTML table of the order that the user can copy-paste into any email client.
 * Button order: Copy (left, primary) | Print/PDF | Open Mail Client (right)
 * Design: Premium B2B Catalog — black/gold/white, Helvetica
 */

import { useRef, useState } from "react";
import { X, Copy, Mail, Check, Printer } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { cleanSize } from "@/lib/exportUtils";

type Props = { onClose: () => void; colorSelection: string };

export default function EmailPreviewModal({ onClose, colorSelection }: Props) {
  const { items, getEffectivePrice } = useOrder();
  const [copied, setCopied] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const date = new Date().toLocaleDateString();

  let grandTotal = 0;
  const rows = items.map((item) => {
    const ep = getEffectivePrice(item);
    const lt = ep * item.quantity;
    grandTotal += lt;
    return { item, ep, lt };
  });

  // ── Copy HTML to clipboard ──────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!tableRef.current) return;
    try {
      const html = tableRef.current.innerHTML;
      const blob = new Blob([html], { type: "text/html" });
      const text = tableRef.current.innerText;
      const textBlob = new Blob([text], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": blob, "text/plain": textBlob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const text = tableRef.current?.innerText ?? "";
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // ── Print / Save as PDF ───────────────────────────────────────────────────
  const handlePrint = () => {
    if (!tableRef.current) return;
    const content = tableRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>IAS Order Summary</title>
  <style>
    @page { size: A4 landscape; margin: 15mm 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 0; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #111; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; letter-spacing: 0.4px; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #f8f8f8; }
    .grand-total-row td { background: #111 !important; color: #fff; font-weight: 700; font-size: 12px; }
    .grand-total-row .amount { color: #B69A5A; }
    .header-block { margin-bottom: 14px; }
    .header-block .company { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
    .header-block .subtitle { color: #555; margin-bottom: 10px; }
    .header-block .divider { border-top: 2px solid #B69A5A; padding-top: 8px; }
    .meta-table td { padding: 2px 20px 2px 0; color: #555; }
    .meta-table td:last-child { font-weight: 600; color: #111; }
    .discount-badge { padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 600; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // ── Open mail client ──────────────────────────────────────────────────────
  // Build a plain-text version of the order and put it directly into the mailto
  // body so the dealer doesn't have to copy-paste first. Browsers can't attach
  // a PDF via mailto (OS limitation) — the dealer can use the Print/PDF button
  // separately if they want a formal attachment.
  const handleMailClient = () => {
    const lines: string[] = [];
    lines.push("Innovative Aluminum Systems — Dealer Order Inquiry");
    lines.push(`Date: ${date}`);
    lines.push(`Color: ${colorSelection === "UNSPECIFIED" ? "To Be Determined" : colorSelection}`);
    lines.push("");
    lines.push("Part Code | Description | Size | Unit | Qty | Unit Price | Line Total");
    lines.push("-".repeat(72));
    for (const { item, ep, lt } of rows) {
      const desc = item.description.replace(/\s+/g, " ").trim();
      const size = cleanSize(item.size) || "—";
      const unitPriceStr = item.isNetPrice ? `NET $${ep.toFixed(2)}` : `$${ep.toFixed(2)}`;
      lines.push(
        `${item.partCode} | ${desc} | ${size} | ${item.unit} | ${item.quantity} | ${unitPriceStr} | $${lt.toFixed(2)}`
      );
    }
    lines.push("-".repeat(72));
    lines.push(`GRAND TOTAL: $${grandTotal.toFixed(2)}`);
    if (colorSelection === "CUSTOM") {
      lines.push("");
      lines.push("*** CONTACT INNOVATIVE FOR CUSTOM POWDER AND PER-ORDER SETUP ADD-ON COST ***");
    }
    lines.push("");
    lines.push("(Tip: use the Print/PDF button in the pricing tool to attach a formatted copy.)");

    const subject = encodeURIComponent("IAS Dealer Order Inquiry");
    const body = encodeURIComponent(lines.join("\n"));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-black text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#B69A5A]" />
            <span className="font-bold text-sm tracking-wide uppercase">Email Preview</span>
            <span className="text-xs text-white/50 ml-2">Copy and paste into your email</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable preview area */}
        <div className="flex-1 overflow-auto p-5 bg-gray-50">
          <div
            ref={tableRef}
            style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "13px", color: "#111" }}
          >
            {/* Header block */}
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: "16px" }} className="header-block">
              <tbody>
                <tr>
                  <td style={{ paddingBottom: "4px" }}>
                    <span className="company" style={{ fontWeight: "bold", fontSize: "16px", letterSpacing: "0.5px" }}>
                      INNOVATIVE ALUMINUM SYSTEMS
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="subtitle" style={{ color: "#555", paddingBottom: "10px" }}>Dealer Order Inquiry</td>
                </tr>
                <tr>
                  <td className="divider" style={{ borderTop: "2px solid #B69A5A", paddingTop: "8px" }}>
                    <table className="meta-table" cellPadding="0" cellSpacing="0">
                      <tbody>
                        <tr>
                          <td style={{ paddingRight: "20px", color: "#555", paddingBottom: "2px" }}>Date:</td>
                          <td style={{ fontWeight: "600" }}>{date}</td>
                        </tr>
                        <tr>
                          <td style={{ paddingRight: "20px", color: "#555" }}>Color:</td>
                          <td style={{ fontWeight: "600" }}>
                            {colorSelection === "UNSPECIFIED" ? "To Be Determined" : colorSelection === "CUSTOM" ? "Custom (specify)" : colorSelection}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Order table */}
            <table
              width="100%"
              cellPadding="0"
              cellSpacing="0"
              style={{ borderCollapse: "collapse", width: "100%" }}
            >
              <thead>
                <tr style={{ backgroundColor: "#111", color: "#fff" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "600", fontSize: "11px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>PART CODE</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "600", fontSize: "11px", letterSpacing: "0.5px" }}>DESCRIPTION</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "600", fontSize: "11px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>SIZE</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "600", fontSize: "11px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>UNIT</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", fontSize: "11px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>QTY</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", fontSize: "11px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>UNIT PRICE</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", fontSize: "11px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>LINE TOTAL</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "600", fontSize: "11px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>DISCOUNT</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, ep, lt }, i) => {
                  const isEven = i % 2 === 0;
                  const priceStr = item.isNetPrice ? "NET" : `$${ep.toFixed(2)}`;
                  const totalStr = `$${lt.toFixed(2)}`;
                  const discountLabel = item.isNetPrice ? "Net" : item.isInfinity ? "Infinity" : "Standard";
                  const discountBg = item.isNetPrice ? "#f4ce47" : item.isInfinity ? "#e8f0fe" : "#f0f0f0";
                  const discountColor = item.isNetPrice ? "#111" : item.isInfinity ? "#1a56db" : "#555";
                  return (
                    <tr key={item.partCode} style={{ backgroundColor: isEven ? "#fff" : "#f8f8f8" }}>
                      <td style={{ padding: "7px 10px", fontFamily: "monospace", fontSize: "12px", whiteSpace: "nowrap", borderBottom: "1px solid #eee" }}>{item.partCode}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #eee" }}>{item.description ?? ""}</td>
                      <td style={{ padding: "7px 10px", whiteSpace: "nowrap", borderBottom: "1px solid #eee" }}>{cleanSize(item.size)}</td>
                      <td style={{ padding: "7px 10px", whiteSpace: "nowrap", borderBottom: "1px solid #eee" }}>{item.unit}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: "600", borderBottom: "1px solid #eee" }}>{item.quantity}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", whiteSpace: "nowrap", borderBottom: "1px solid #eee" }}>{priceStr}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", whiteSpace: "nowrap", fontWeight: "600", borderBottom: "1px solid #eee" }}>{totalStr}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #eee" }}>
                        <span className="discount-badge" style={{ backgroundColor: discountBg, color: discountColor, padding: "1px 6px", borderRadius: "3px", fontSize: "11px", fontWeight: "600" }}>{discountLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="grand-total-row" style={{ backgroundColor: "#111", color: "#fff" }}>
                  <td colSpan={6} style={{ padding: "10px 10px", textAlign: "right", fontWeight: "700", fontSize: "13px", letterSpacing: "0.5px" }}>GRAND TOTAL</td>
                  <td className="amount" style={{ padding: "10px 10px", textAlign: "right", fontWeight: "700", fontSize: "14px", color: "#B69A5A", whiteSpace: "nowrap" }}>${grandTotal.toFixed(2)}</td>
                  <td style={{ padding: "10px 10px" }}></td>
                </tr>
              </tfoot>
            </table>

            {/* Custom-color disclaimer (Mike's call: bold red, immediately after the total) */}
            {colorSelection === "CUSTOM" && (
              <div style={{ marginTop: "12px", padding: "10px 12px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "4px" }}>
                <p style={{ margin: 0, color: "#B91C1C", fontWeight: "700", fontSize: "12px", lineHeight: "1.4" }}>
                  Contact Innovative for Custom Powder and Per-order Setup Add-On Cost
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons — Copy first (left/primary), then Print, then Open Mail Client */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-white flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            Click <strong>Copy</strong> then paste directly into your email body.
          </p>
          <div className="flex items-center gap-2">
            {/* PRIMARY: Copy */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded transition-colors"
              style={{ backgroundColor: copied ? "#22c55e" : "#B69A5A", color: "#fff" }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            {/* Print / Save as PDF */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            {/* Open Mail Client */}
            <button
              onClick={handleMailClient}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Open Mail Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
