/**
 * IAS EmailPreviewModal
 * Shows a formatted HTML table of the order that the user can copy-paste into any email client.
 * Also provides a "Open Mail Client" button that pre-fills subject + plain-text fallback.
 */

import { useRef } from "react";
import { X, Copy, Mail, Check } from "lucide-react";
import { useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { cleanSize } from "@/lib/exportUtils";

type Props = { onClose: () => void };

export default function EmailPreviewModal({ onClose }: Props) {
  const { items, getEffectivePrice, standardDiscount, infinityDiscount } = useOrder();
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
      // Fallback: copy plain text
      const text = tableRef.current?.innerText ?? "";
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // ── Open mail client with plain-text body ───────────────────────────────────
  const handleMailClient = () => {
    const subject = encodeURIComponent("IAS Dealer Order Inquiry");
    let body = `INNOVATIVE ALUMINUM SYSTEMS\nDealer Order Inquiry\n`;
    body += `Date: ${date}\n`;
    body += `Standard Discount: ${standardDiscount}%  |  Infinity Discount: ${infinityDiscount}%\n\n`;
    body += `Please see the order details below (best viewed in a table-capable email client).\n\n`;
    rows.forEach(({ item, ep, lt }) => {
      const price = item.isNetPrice ? "NET" : `$${ep.toFixed(2)}`;
      body += `${item.partCode}  |  ${item.description ?? ""}  |  ${cleanSize(item.size)}  |  ${item.unit}  |  Qty: ${item.quantity}  |  ${price}  |  $${lt.toFixed(2)}\n`;
    });
    body += `\nGRAND TOTAL: $${grandTotal.toFixed(2)}\n`;
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

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
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: "16px" }}>
              <tbody>
                <tr>
                  <td style={{ paddingBottom: "4px" }}>
                    <span style={{ fontWeight: "bold", fontSize: "16px", letterSpacing: "0.5px" }}>
                      INNOVATIVE ALUMINUM SYSTEMS
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "#555", paddingBottom: "12px" }}>Dealer Order Inquiry</td>
                </tr>
                <tr>
                  <td style={{ borderTop: "2px solid #B69A5A", paddingTop: "10px" }}>
                    <table cellPadding="0" cellSpacing="0">
                      <tbody>
                        <tr>
                          <td style={{ paddingRight: "24px", color: "#555" }}>Date:</td>
                          <td style={{ fontWeight: "600" }}>{date}</td>
                        </tr>
                        <tr>
                          <td style={{ paddingRight: "24px", color: "#555" }}>Standard Discount:</td>
                          <td style={{ fontWeight: "600" }}>{standardDiscount}%</td>
                        </tr>
                        <tr>
                          <td style={{ paddingRight: "24px", color: "#555" }}>Infinity Discount:</td>
                          <td style={{ fontWeight: "600" }}>{infinityDiscount}%</td>
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
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "600", fontSize: "11px", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>TYPE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, ep, lt }, i) => {
                  const isEven = i % 2 === 0;
                  const priceStr = item.isNetPrice ? "NET" : `$${ep.toFixed(2)}`;
                  const totalStr = `$${lt.toFixed(2)}`;
                  const typeLabel = item.isNetPrice ? "Net" : item.isInfinity ? "Infinity" : "Standard";
                  const typeBg = item.isNetPrice ? "#f4ce47" : item.isInfinity ? "#e8f0fe" : "transparent";
                  const typeColor = item.isNetPrice ? "#111" : item.isInfinity ? "#1a56db" : "#555";
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
                        <span style={{ backgroundColor: typeBg, color: typeColor, padding: "1px 6px", borderRadius: "3px", fontSize: "11px", fontWeight: "600" }}>{typeLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#111", color: "#fff" }}>
                  <td colSpan={6} style={{ padding: "10px 10px", textAlign: "right", fontWeight: "700", fontSize: "13px", letterSpacing: "0.5px" }}>GRAND TOTAL</td>
                  <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: "700", fontSize: "14px", color: "#B69A5A", whiteSpace: "nowrap" }}>${grandTotal.toFixed(2)}</td>
                  <td style={{ padding: "10px 10px" }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-white flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            Click <strong>Copy</strong> then paste directly into your email body.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMailClient}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Open Mail Client
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded transition-colors"
              style={{ backgroundColor: copied ? "#22c55e" : "#B69A5A", color: "#fff" }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
