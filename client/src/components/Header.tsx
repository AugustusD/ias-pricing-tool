/**
 * IAS Header Component
 * White background with gold bottom border — logo fully visible against white
 * Text: black/dark-grey for readability; gold accents for brand elements
 */

import { ShoppingCart, Download, Mail, LayoutList, Search, ChevronDown } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { useState, useRef, useEffect } from "react";

const IAS_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663093943154/eWb5yXbeMwxfmcDcdW8bmF/small200_e0c33b5e.png";

type HeaderProps = {
  totalItems: number;
  totalPrice: number;
  onOrderPanelToggle: () => void;
  onExport: () => void;
  onEmail: () => void;
  onSummary: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
};

export default function Header({
  totalItems,
  totalPrice,
  onOrderPanelToggle,
  onExport,
  onEmail,
  onSummary,
  searchQuery,
  onSearchChange,
}: HeaderProps) {
  const { standardDiscount, infinityDiscount, setStandardDiscount, setInfinityDiscount } = useOrder();
  const [showDiscounts, setShowDiscounts] = useState(false);
  const discountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (discountRef.current && !discountRef.current.contains(e.target as Node)) {
        setShowDiscounts(false);
      }
    }
    if (showDiscounts) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDiscounts]);

  return (
    <header className="ias-header flex-shrink-0 z-50">
      <div className="flex items-center gap-0 h-14 px-3">
        {/* Logo */}
        <div className="flex items-center gap-3 pr-4 border-r border-black/10 mr-4 flex-shrink-0">
          <img
            src={IAS_LOGO}
            alt="Innovative Aluminum Systems"
            className="h-10 w-auto object-contain"
          />
          <div className="hidden lg:block">
            <div className="text-[#B69A5A] text-[0.7rem] font-bold uppercase tracking-[0.12em] leading-tight">
              Dealer Pricing Tool
            </div>
            <div className="text-black/40 text-[0.6rem] uppercase tracking-[0.1em] leading-tight">
              2026 Price List
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/35" />
          <input
            type="text"
            placeholder="Search part code or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-black/5 text-black placeholder-black/30 text-xs pl-8 pr-3 py-2 rounded border border-black/12 focus:outline-none focus:border-[#B69A5A] focus:bg-white transition-all"
          />
        </div>

        {/* Discount controls */}
        <div className="relative ml-3 flex-shrink-0" ref={discountRef}>
          <button
            onClick={() => setShowDiscounts(!showDiscounts)}
            className="flex items-center gap-1.5 text-xs text-black/60 hover:text-black bg-black/5 hover:bg-black/10 px-3 py-2 rounded border border-black/12 transition-all"
          >
            <span className="hidden sm:inline">Discounts</span>
            {(standardDiscount > 0 || infinityDiscount > 0) && (
              <span className="text-[#B69A5A] font-bold text-[0.7rem]">●</span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${showDiscounts ? "rotate-180" : ""}`} />
          </button>

          {showDiscounts && (
            <div className="absolute top-full right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded shadow-2xl p-4 z-50 w-64">
              <div className="text-[#B69A5A] text-[0.65rem] font-bold uppercase tracking-widest mb-3">
                Dealer Discounts
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-white/60 text-xs block mb-1">Standard Product</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={standardDiscount}
                      onChange={(e) => setStandardDiscount(Number(e.target.value))}
                      className="flex-1 accent-[#B69A5A]"
                    />
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={standardDiscount}
                      onChange={(e) => setStandardDiscount(Math.min(50, Math.max(0, Number(e.target.value))))}
                      className="w-12 bg-white/10 text-white text-xs font-bold text-center rounded border border-white/20 py-0.5"
                    />
                    <span className="text-white/50 text-xs">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-xs block mb-1">Infinity Product</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={infinityDiscount}
                      onChange={(e) => setInfinityDiscount(Number(e.target.value))}
                      className="flex-1 accent-[#B69A5A]"
                    />
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={infinityDiscount}
                      onChange={(e) => setInfinityDiscount(Math.min(50, Math.max(0, Number(e.target.value))))}
                      className="w-12 bg-white/10 text-white text-xs font-bold text-center rounded border border-white/20 py-0.5"
                    />
                    <span className="text-white/50 text-xs">%</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-white/10 text-white/40 text-[0.65rem]">
                  Net price items are not discounted
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onExport}
            title="Export to Excel"
            className="flex items-center gap-1.5 text-xs text-black/60 hover:text-black bg-black/5 hover:bg-black/10 px-3 py-2 rounded border border-black/12 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>

          <button
            onClick={onEmail}
            title="Create Email"
            className="flex items-center gap-1.5 text-xs text-black/60 hover:text-black bg-black/5 hover:bg-black/10 px-3 py-2 rounded border border-black/12 transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Email</span>
          </button>

          <button
            onClick={onSummary}
            title="View Order Summary"
            className="flex items-center gap-1.5 text-xs text-black/60 hover:text-black bg-black/5 hover:bg-black/10 px-3 py-2 rounded border border-black/12 transition-all"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Summary</span>
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
