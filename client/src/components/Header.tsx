/**
 * IAS Header Component
 * White background with gold bottom border.
 * Discount fields are always visible inline — highlighted amber when left at 0%.
 * Values persist via localStorage (managed in OrderContext).
 * Reset Order button (branded yellow) clears the order with a confirm step.
 * Search field has an X clear button.
 * Profile filter buttons (Square / Round / Flat / Colonial) sit between search and discounts.
 */

import { ShoppingCart, Download, Mail, LayoutList, Search, X, RotateCcw } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { useState, type Dispatch, type SetStateAction } from "react";

const IAS_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663093943154/eWb5yXbeMwxfmcDcdW8bmF/small200_e0c33b5e.png";

const PROFILE_FILTERS = ["Square", "Round", "Flat", "Colonial", "LOPRO"] as const;

const IAS_COLORS = [
  "UNSPECIFIED",
  "White",
  "Light Ivory",
  "Sandalwood",
  "Oyster Grey",
  "Beige",
  "Silver Matte",
  "Coastal Grey",
  "Hartford Green",
  "Phantom Bronze",
  "Rideau Brown",
  "Sparrow Grey",
  "Black",
  "Textured Black",
  "Flat Black",
  "CUSTOM",
] as const;

type HeaderProps = {
  totalItems: number;
  totalPrice: number;
  onOrderPanelToggle: () => void;
  onExport: () => void;
  onEmail: () => void;
  onSummary: () => void;
  onReset: () => void;
  resetConfirm: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchClear: () => void;
  profileFilter: string[];
  /** Accepts either the next value or a functional updater — so rapid clicks
   *  don't drop selections from a stale closure. */
  onProfileFilterChange: Dispatch<SetStateAction<string[]>>;
  colorSelection: string;
  onColorChange: (color: string) => void;
  /** When true, color selector glows amber to signal required-field state. */
  colorRequired?: boolean;
};

/** Controlled percent input — shows raw string while typing, commits on blur/enter */
function DiscountField({
  label,
  value,
  onChange,
  highlight,
  locked,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  highlight: boolean;
  locked?: boolean;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const displayed = raw !== null ? raw : String(value);

  function commit(str: string) {
    setRaw(null);
    const n = parseFloat(str);
    if (!isNaN(n)) onChange(Math.min(100, Math.max(0, n)));
    else onChange(0);
  }

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-black/50 hidden lg:block whitespace-nowrap">
        {label}
      </span>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={displayed}
          readOnly={locked}
          onChange={(e) => { if (!locked) setRaw(e.target.value); }}
          onBlur={(e) => { if (!locked) commit(e.target.value); }}
          onKeyDown={(e) => {
            if (locked) return;
            if (e.key === "Enter") {
              commit((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).blur();
            }
          }}
          title={locked ? "Set by Innovative Aluminum admin." : undefined}
          className={[
            "w-20 text-center text-sm font-bold pr-6 pl-2 py-1.5 rounded border transition-all focus:outline-none",
            locked
              ? "border-[#B69A5A] bg-[#FAF8F2] text-[#3D2E14] cursor-not-allowed"
              : highlight
              ? "border-[#f4ce47] bg-[#f4ce47]/20 text-black ring-1 ring-[#f4ce47] animate-pulse focus:animate-none focus:ring-[#B69A5A] focus:border-[#B69A5A] focus:bg-white"
              : "border-black/15 bg-white text-black focus:border-[#B69A5A] focus:ring-1 focus:ring-[#B69A5A]",
          ].join(" ")}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-black/40 pointer-events-none font-medium">
          %
        </span>
      </div>
      {/* Label shown below on small screens */}
      <span className="text-[0.6rem] text-black/40 lg:hidden whitespace-nowrap">{label.split(" ")[0]}</span>
    </div>
  );
}

export default function Header({
  totalItems,
  totalPrice,
  onOrderPanelToggle,
  onExport,
  onEmail,
  onSummary,
  onReset,
  resetConfirm,
  searchQuery,
  onSearchChange,
  onSearchClear,
  profileFilter,
  onProfileFilterChange,
  colorSelection,
  onColorChange,
  colorRequired,
}: HeaderProps) {
  const { standardDiscount, infinityDiscount, setStandardDiscount, setInfinityDiscount, discountLocked, standardLocked, infinityLocked } = useOrder();

  // Don't highlight as "missing" when admin set them to 0 — the lock indicates
  // the value is intentional, not blank. Per-field, so an unlocked-but-blank
  // field still asks the dealer to fill it in.
  const stdBlank = !standardLocked && standardDiscount === 0;
  const infBlank = !infinityLocked && infinityDiscount === 0;

  return (
    <header className="ias-header flex-shrink-0 z-50">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 min-h-14">
        {/* Logo */}
        <div className="flex items-center gap-3 pr-4 border-r border-black/10 mr-2 flex-shrink-0">
          <img
            src={IAS_LOGO}
            alt="Innovative Aluminum Systems"
            className="h-10 w-auto object-contain"
          />
          <div className="hidden xl:block">
            <div className="text-[#B69A5A] text-[0.7rem] font-bold uppercase tracking-[0.12em] leading-tight">
              Dealer Pricing Tool
            </div>
            <div className="text-black/40 text-[0.6rem] uppercase tracking-[0.1em] leading-tight">
              2026 Price List
            </div>
          </div>
        </div>

        {/* Search with clear X — full width on mobile, capped on desktop */}
        <div className="order-last w-full md:order-none md:w-auto md:flex-1 md:max-w-xs relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/35 pointer-events-none" />
          <input
            type="text"
            placeholder="Search part code or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-black/5 text-black placeholder-black/30 text-xs pl-8 pr-7 py-2 rounded border border-black/12 focus:outline-none focus:border-[#B69A5A] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={onSearchClear}
              title="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-black/35 hover:text-black transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Color Selector ── */}
        <div
          className={[
            "flex items-center gap-1.5 px-2 py-1 rounded border flex-shrink-0 transition-all",
            colorRequired && colorSelection === "UNSPECIFIED"
              ? "border-[#f4ce47] bg-[#f4ce47]/15 ring-1 ring-[#f4ce47]"
              : "border-black/10 bg-black/[0.02]",
          ].join(" ")}
        >
          <span
            className={[
              "text-[0.55rem] font-bold uppercase tracking-widest hidden xl:block whitespace-nowrap",
              colorRequired && colorSelection === "UNSPECIFIED"
                ? "text-[#B69A5A]"
                : "text-black/25",
            ].join(" ")}
          >
            Color{colorRequired && colorSelection === "UNSPECIFIED" ? " *" : ""}
          </span>
          <select
            value={colorSelection}
            onChange={(e) => onColorChange(e.target.value)}
            className={[
              "text-[0.65rem] font-semibold pl-2 pr-6 py-1 rounded border transition-all appearance-none bg-no-repeat cursor-pointer focus:outline-none",
              colorRequired && colorSelection === "UNSPECIFIED"
                ? "border-[#f4ce47] bg-white text-black animate-pulse focus:animate-none focus:border-[#B69A5A]"
                : colorSelection === "UNSPECIFIED"
                ? "border-black/15 bg-white text-black/40 focus:border-[#B69A5A]"
                : colorSelection === "CUSTOM"
                ? "border-[#B69A5A] bg-[#B69A5A]/10 text-black focus:border-[#B69A5A]"
                : "border-[#B69A5A] bg-[#B69A5A] text-black font-bold focus:border-[#9a8040]",
            ].join(" ")}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E")`,
              backgroundPosition: "right 0.4rem center",
              backgroundSize: "8px 5px",
            }}
          >
            {IAS_COLORS.map((c) => (
              <option key={c} value={c}>
                {c === "UNSPECIFIED" ? "To Be Determined" : c === "CUSTOM" ? "Custom…" : c}
              </option>
            ))}
          </select>
        </div>

        {/* ── Profile Filter Buttons (multi-select, click again to un-select) ── */}
        <div className="flex items-center gap-1 px-2 py-1 rounded border border-black/10 bg-black/[0.02] flex-shrink-0">
          <span className="text-[0.55rem] font-bold uppercase tracking-widest text-black/25 hidden xl:block mr-1 whitespace-nowrap">
            Profile
          </span>
          {PROFILE_FILTERS.map((profile) => {
            const active = profileFilter.includes(profile);
            const toggle = () => {
              onProfileFilterChange((prev) =>
                prev.includes(profile)
                  ? prev.filter((p) => p !== profile)
                  : [...prev, profile]
              );
            };
            return (
              <button
                key={profile}
                onClick={toggle}
                title={active ? `Un-select ${profile}` : `Add ${profile} to filter`}
                className={[
                  "text-[0.65rem] font-bold px-2.5 py-1 rounded transition-all duration-150 whitespace-nowrap",
                  active
                    ? "bg-[#B69A5A] text-black border border-[#9a8040] shadow-sm"
                    : "bg-transparent text-black/45 border border-transparent hover:border-black/20 hover:text-black/70 hover:bg-black/5",
                ].join(" ")}
              >
                {profile}
              </button>
            );
          })}
          {profileFilter.length > 0 && (
            <button
              onClick={() => onProfileFilterChange([])}
              title="Clear all profile filters"
              className="ml-1 text-[0.6rem] text-black/40 hover:text-black underline decoration-dotted whitespace-nowrap"
            >
              clear
            </button>
          )}
        </div>

        {/* ── Always-visible Discount Fields ── */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-black/10 bg-black/[0.03] flex-shrink-0">
          {/* Divider label */}
          <span className="text-[0.6rem] font-bold uppercase tracking-widest text-black/30 hidden xl:block">
            Discounts
          </span>
          <div className="w-px h-5 bg-black/10 hidden xl:block" />

          <DiscountField
            label="Standard"
            value={standardDiscount}
            onChange={setStandardDiscount}
            highlight={stdBlank}
            locked={standardLocked}
          />

          <div className="w-px h-5 bg-black/10" />

          <DiscountField
            label="Infinity"
            value={infinityDiscount}
            onChange={setInfinityDiscount}
            highlight={infBlank}
            locked={infinityLocked}
          />

          {/* Hint copy: "set by IAS" when locked, "← Enter your discount" when blank */}
          {discountLocked ? (
            <span className="text-[0.6rem] text-[#B69A5A] font-bold uppercase tracking-wider hidden lg:block whitespace-nowrap">
              Set by IAS
            </span>
          ) : (stdBlank || infBlank) && (
            <span className="text-[0.6rem] text-[#B69A5A] font-semibold hidden lg:block whitespace-nowrap">
              ← Enter your discount
            </span>
          )}
        </div>

        {/* Action buttons — pushed right by ml-auto so the search can grow */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">

          {/* Reset Order — branded yellow, confirm step */}
          <button
            onClick={onReset}
            title={resetConfirm ? "Click again to confirm reset" : "Reset / Clear Order"}
            className={[
              "flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded border transition-all",
              resetConfirm
                ? "bg-red-500 border-red-600 text-white hover:bg-red-600 animate-pulse"
                : "bg-[#f4ce47] border-[#e0b800] text-black hover:bg-[#ffe066]",
            ].join(" ")}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">
              {resetConfirm ? "Confirm?" : "Reset"}
            </span>
          </button>

          <button
            onClick={onExport}
            title="Export to Excel"
            className="flex items-center gap-1.5 text-xs text-black/60 hover:text-black bg-black/5 hover:bg-black/10 px-3 py-2 rounded border border-black/12 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Export</span>
          </button>

          <button
            onClick={onEmail}
            title="Create Email"
            className="flex items-center gap-1.5 text-xs text-black/60 hover:text-black bg-black/5 hover:bg-black/10 px-3 py-2 rounded border border-black/12 transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Email</span>
          </button>

          <button
            onClick={onSummary}
            title="View Order Summary"
            className="flex items-center gap-1.5 text-xs text-black/60 hover:text-black bg-black/5 hover:bg-black/10 px-3 py-2 rounded border border-black/12 transition-all"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Summary</span>
          </button>

          {/* Cart button */}
          <button
            onClick={onOrderPanelToggle}
            className="flex items-center gap-2 bg-[#B69A5A] hover:bg-[#c9ae6d] text-black text-xs font-bold px-3 py-2 rounded transition-all ml-1"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Order</span>
            {totalItems > 0 && (
              <span className="bg-[#1a1a1a] text-white text-[0.65rem] font-black px-1.5 py-0.5 rounded-sm min-w-[1.25rem] text-center">
                {totalItems}
              </span>
            )}
            {totalItems > 0 && (
              <span className="hidden lg:inline text-black/70">
                ${totalPrice.toFixed(2)}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
