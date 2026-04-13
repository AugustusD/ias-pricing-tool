/**
 * PrintQuoteModal
 * Design: IAS branded print layout — black/gold/white, Helvetica
 *
 * Uses a React portal to mount the print container as a DIRECT child of <body>.
 * This is required so that @media print { body > * { display:none } } correctly
 * hides the main app (#root) while showing only the print container.
 *
 * The screen overlay (dim + toolbar) is rendered inside #root as normal.
 * The printable document is portalled to body as #ias-print-portal.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const portalRef = useRef<HTMLDivElement | null>(null);

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

  // Create a dedicated portal container as a direct child of <body>
  useEffect(() => {
    const el = document.createElement("div");
    el.id = "ias-print-portal";
    document.body.appendChild(el);
    portalRef.current = el;

    // Inject print styles into <head>
    const style = document.createElement("style");
    style.id = "ias-print-styles";
    style.textContent = `
      @media print {
        body > *:not(#ias-print-portal) { display: none !important; }
        #ias-print-portal { display: block !important; }
        @page { size: Letter landscape; margin: 0.5in 0.45in; }
      }
      @media screen {
        #ias-print-portal { display: none; }
      }
    `;
    document.head.appendChild(style);

    // Auto-trigger print after layout settles
    const t = setTimeout(() => window.print(), 500);

    return () => {
      clearTimeout(t);
      document.body.removeChild(el);
      document.getElementById("ias-print-styles")?.remove();
      portalRef.current = null;
    };
  }, []);

  const printDocument = (
    <div
      style={{
        width: "100%",
        fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
        fontSize: "9pt",
        color: "#111",
        background: "#fff",
      }}
    >
      {/* Document header */}
      <div
        style={{
          background: "#111",
          padding: "0.25in 0.35in 0.2in",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <img src={IAS_LOGO} alt="Innovative Aluminum Systems" style={{ height: "2rem" }} />
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color: "#B69A5A",
              fontWeight: 700,
              fontSize: "11pt",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Dealer Order Quote
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "7.5pt", marginTop: "2px" }}>
            2026 Price List
          </div>
        </div>
      </div>

      {/* Gold rule */}
      <div style={{ height: "3px", background: "#B69A5A" }} />

      {/* Quote meta */}
      <div
        style={{
          padding: "0.14in 0.35in",
          display: "flex",
          gap: "2rem",
          borderBottom: "1px solid #e5e5e5",
          background: "#fafafa",
          flexWrap: "wrap",
        }}
      >
        <MetaField label="Date" value={date} />
        <MetaField
          label="Standard Discount"
          value={`${standardDiscount}%`}
          warn={standardDiscount === 0}
        />
        <MetaField
          label="Infinity Discount"
          value={`${infinityDiscount}%`}
          warn={infinityDiscount === 0}
        />
        {colorSelection && colorSelection !== "UNSPECIFIED" && (
          <MetaField
            label="Color"
            value={colorSelection === "CUSTOM" ? "Custom (specify)" : colorSelection}
          />
        )}
        {profileFilter && (
          <MetaField label="Profile Filter" value={`${profileFilter} Top Rail`} />
        )}
        <MetaField label="Total Items" value={String(items.length)} />
      </div>

      {/* Order table */}
      <div style={{ padding: "0.12in 0.35in 0.25in" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
          <thead>
            <tr style={{ background: "#111", color: "#B69A5A" }}>
              <Th style={{ width: "1.3in" }}>Part Code</Th>
              <Th style={{ textAlign: "left" }}>Description</Th>
              <Th style={{ width: "0.65in" }}>Size</Th>
              <Th style={{ width: "0.55in" }}>Unit</Th>
              <Th style={{ width: "0.4in", textAlign: "right" }}>Qty</Th>
              <Th style={{ width: "0.85in", textAlign: "right" }}>Dealer Price</Th>
              <Th style={{ width: "0.85in", textAlign: "right" }}>Your Price</Th>
              <Th style={{ width: "0.85in", textAlign: "right" }}>Line Total</Th>
              <Th style={{ width: "0.6in", textAlign: "center" }}>Type</Th>
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
                  <Td
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      color: isNet ? "#666" : "#111",
                    }}
                  >
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

        {/* Grand total */}
        <div
          style={{
            marginTop: "0.1in",
            display: "flex",
            justifyContent: "flex-end",
            borderTop: "2px solid #B69A5A",
            paddingTop: "0.08in",
          }}
        >
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: "7.5pt",
                color: "#888",
                marginRight: "1rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Grand Total
            </span>
            <span style={{ fontSize: "13pt", fontWeight: 800, color: "#111" }}>
              ${grandTotal.toFixed(2)}
            </span>
            <div style={{ fontSize: "6.5pt", color: "#bbb", marginTop: "2px" }}>
              * Net price items excluded from total
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #e5e5e5",
          padding: "0.08in 0.35in",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fafafa",
        }}
      >
        <span style={{ fontSize: "6.5pt", color: "#bbb" }}>
          Innovative Aluminum Systems — Dealer Pricing Tool — 2026 Price List
        </span>
        <span style={{ fontSize: "6.5pt", color: "#bbb" }}>Printed {date}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Screen overlay — stays inside #root, hidden when printing */}
      <div className="fixed inset-0 z-[200] bg-black/70 flex items-start justify-center overflow-auto py-10">
        {/* Toolbar */}
        <div className="fixed top-4 right-4 flex items-center gap-2 z-[201]">
          <button
            onClick={() => window.print()}
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

        {/* Screen preview of the document */}
        <div
          className="bg-white shadow-2xl"
          style={{
            width: "10.5in",
            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
            fontSize: "9pt",
            color: "#111",
          }}
        >
          {printDocument}
        </div>
      </div>

      {/* Portalled print-only copy — direct child of <body> */}
      {portalRef.current && createPortal(printDocument, portalRef.current)}
    </>
  );
}

/* ── Helpers ── */

function MetaField({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "6pt",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#aaa",
          marginBottom: "2px",
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: "9pt", color: warn ? "#cc6600" : "#111" }}>
        {value}
      </div>
    </div>
  );
}

function Th({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        padding: "0.055in 0.07in",
        fontWeight: 700,
        fontSize: "7pt",
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

function Td({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: "0.04in 0.07in",
        textAlign: "center",
        verticalAlign: "middle",
        ...style,
      }}
    >
      {children}
    </td>
  );
}
