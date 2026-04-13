/**
 * PrintQuoteModal
 * Design: IAS branded print layout — black/gold/white, Helvetica
 * Opens a full-screen overlay showing the formatted quote, then calls window.print().
 * A @media print block hides the overlay chrome and prints only the quote content.
 * The dealer can choose their printer or "Save as PDF" from the browser dialog.
 */

import { useEffect, useRef } from "react";
import { X, Printer } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { cleanSize } from "@/lib/exportUtils";

const IAS_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663093943154/eWb5yXbeMwxfmcDcdW8bmF/small200_e0c33b5e.png";

type Props = {
  onClose: () => void;
  colorSelection: string;
  profileFilter: string | null;
};

export default function PrintQuoteModal({ onClose, colorSelection, profileFilter }: Props) {
  const { items, getEffectivePrice, standardDiscount, infinityDiscount } = useOrder();
  const printRef = useRef<HTMLDivElement>(null);

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let grandTotal = 0;
  const rows = items.map((item) => {
    const effectivePrice = getEffectivePrice(item);
    const lineTotal = effectivePrice * item.quantity;
    grandTotal += lineTotal;
    return { item, effectivePrice, lineTotal };
  });

  function handlePrint() {
    window.print();
  }

  // Auto-trigger print after a short delay so the layout renders first
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* ── Print-only styles injected into <head> ── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #ias-print-root { display: block !important; }
          #ias-print-root .no-print { display: none !important; }
          @page {
            size: Letter landscape;
            margin: 0.6in 0.5in;
          }
        }
        @media screen {
          #ias-print-root { display: flex; }
        }
      `}</style>

      {/* ── Screen overlay ── */}
      <div
        id="ias-print-root"
        className="fixed inset-0 z-[200] bg-black/60 items-start justify-center overflow-auto py-8"
      >
        {/* Toolbar — hidden when printing */}
        <div className="no-print fixed top-4 right-4 flex items-center gap-2 z-[201]">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#B69A5A] hover:bg-[#c9ae6d] text-black text-xs font-bold px-4 py-2 rounded shadow-lg transition-all"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-white hover:bg-gray-100 text-black text-xs font-semibold px-3 py-2 rounded shadow-lg border border-black/15 transition-all"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>

        {/* ── Printable document ── */}
        <div
          ref={printRef}
          className="bg-white shadow-2xl"
          style={{
            width: "10.5in",
            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
            fontSize: "9pt",
            color: "#111",
          }}
        >
          {/* Document header */}
          <div
            style={{
              background: "#111",
              padding: "0.3in 0.4in 0.25in",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <img src={IAS_LOGO} alt="Innovative Aluminum Systems" style={{ height: "2.2rem" }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#B69A5A", fontWeight: 700, fontSize: "11pt", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Dealer Order Quote
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "7.5pt", marginTop: "2px" }}>
                2026 Price List
              </div>
            </div>
          </div>

          {/* Gold rule */}
          <div style={{ height: "3px", background: "#B69A5A" }} />

          {/* Quote meta */}
          <div
            style={{
              padding: "0.18in 0.4in",
              display: "flex",
              gap: "2rem",
              borderBottom: "1px solid #e5e5e5",
              background: "#fafafa",
            }}
          >
            <MetaField label="Date" value={date} />
            <MetaField label="Standard Discount" value={`${standardDiscount}%`} highlight={standardDiscount === 0} />
            <MetaField label="Infinity Discount" value={`${infinityDiscount}%`} highlight={infinityDiscount === 0} />
            {colorSelection && colorSelection !== "UNSPECIFIED" && (
              <MetaField label="Color" value={colorSelection === "CUSTOM" ? "Custom (specify)" : colorSelection} />
            )}
            {profileFilter && (
              <MetaField label="Profile Filter" value={`${profileFilter} Top Rail`} />
            )}
            <MetaField label="Items" value={String(items.length)} />
          </div>

          {/* Order table */}
          <div style={{ padding: "0.15in 0.4in 0.3in" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt" }}>
              <thead>
                <tr style={{ background: "#111", color: "#B69A5A" }}>
                  <Th style={{ width: "1.4in" }}>Part Code</Th>
                  <Th style={{ textAlign: "left" }}>Description</Th>
                  <Th style={{ width: "0.7in" }}>Size</Th>
                  <Th style={{ width: "0.55in" }}>Unit</Th>
                  <Th style={{ width: "0.45in", textAlign: "right" }}>Qty</Th>
                  <Th style={{ width: "0.85in", textAlign: "right" }}>Dealer Price</Th>
                  <Th style={{ width: "0.85in", textAlign: "right" }}>Your Price</Th>
                  <Th style={{ width: "0.85in", textAlign: "right" }}>Line Total</Th>
                  <Th style={{ width: "0.7in", textAlign: "center" }}>Type</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, effectivePrice, lineTotal }, idx) => {
                  const isNet = item.isNetPrice;
                  const isInf = item.isInfinity;
                  return (
                    <tr
                      key={item.partCode}
                      style={{
                        background: idx % 2 === 0 ? "#fff" : "#f7f7f5",
                        borderBottom: "1px solid #ebebeb",
                      }}
                    >
                      <Td style={{ fontWeight: 700, letterSpacing: "0.03em", color: "#333" }}>
                        {item.partCode}
                      </Td>
                      <Td style={{ textAlign: "left", color: "#444" }}>{item.description}</Td>
                      <Td style={{ color: "#666" }}>{cleanSize(item.size)}</Td>
                      <Td style={{ color: "#666" }}>{item.unit}</Td>
                      <Td style={{ textAlign: "right", fontWeight: 600 }}>{item.quantity}</Td>
                      <Td style={{ textAlign: "right", color: "#888" }}>
                        {item.dealerPrice !== null ? `$${item.dealerPrice.toFixed(2)}` : "—"}
                      </Td>
                      <Td style={{ textAlign: "right", fontWeight: 700, color: isNet ? "#666" : "#111" }}>
                        {isNet ? "NET" : `$${effectivePrice.toFixed(2)}`}
                      </Td>
                      <Td style={{ textAlign: "right", fontWeight: 700 }}>
                        {isNet ? "—" : `$${lineTotal.toFixed(2)}`}
                      </Td>
                      <Td
                        style={{
                          textAlign: "center",
                          fontSize: "7pt",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: isNet ? "#888" : isInf ? "#B69A5A" : "#555",
                        }}
                      >
                        {isNet ? "Net" : isInf ? "Infinity" : "Std"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals row */}
            <div
              style={{
                marginTop: "0.12in",
                display: "flex",
                justifyContent: "flex-end",
                borderTop: "2px solid #B69A5A",
                paddingTop: "0.1in",
              }}
            >
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "8pt", color: "#888", marginRight: "1rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Grand Total
                </span>
                <span style={{ fontSize: "13pt", fontWeight: 800, color: "#111" }}>
                  ${grandTotal.toFixed(2)}
                </span>
                <div style={{ fontSize: "7pt", color: "#aaa", marginTop: "2px" }}>
                  * Net price items excluded from total
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid #e5e5e5",
              padding: "0.1in 0.4in",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fafafa",
            }}
          >
            <span style={{ fontSize: "7pt", color: "#bbb" }}>
              Innovative Aluminum Systems — Dealer Pricing Tool — 2026 Price List
            </span>
            <span style={{ fontSize: "7pt", color: "#bbb" }}>
              Printed {date}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Small helpers ── */

function MetaField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: "6.5pt", textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa", marginBottom: "2px" }}>
        {label}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: "9pt",
          color: highlight ? "#cc6600" : "#111",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th
      style={{
        padding: "0.06in 0.08in",
        fontWeight: 700,
        fontSize: "7.5pt",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        textAlign: "center",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td
      style={{
        padding: "0.045in 0.08in",
        textAlign: "center",
        verticalAlign: "middle",
        ...style,
      }}
    >
      {children}
    </td>
  );
}
