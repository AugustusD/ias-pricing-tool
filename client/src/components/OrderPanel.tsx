/**
 * IAS OrderPanel Component
 * Sliding panel showing current order items with quantity controls
 */

import { X, Trash2, Download, Mail, LayoutList, Minus, Plus } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { cleanSize } from "@/lib/exportUtils";

type OrderPanelProps = {
  onClose: () => void;
  onExport: () => void;
  onEmail: () => void;
  onSummary: () => void;
};

export default function OrderPanel({ onClose, onExport, onEmail, onSummary }: OrderPanelProps) {
  const { items, removeItem, updateQuantity, totalItems, totalPrice, getEffectivePrice, clearOrder, standardDiscount, infinityDiscount } = useOrder();

  return (
    <div className="order-panel w-80 flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="order-panel-header flex items-center justify-between">
        <div>
          <div className="text-[#B69A5A] text-[0.6rem] font-bold uppercase tracking-widest">
            Current Order
          </div>
          <div className="text-white text-sm font-bold">
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Discount info */}
      {(standardDiscount > 0 || infinityDiscount > 0) && (
        <div className="bg-[#B69A5A]/10 border-b border-[#B69A5A]/20 px-3 py-2">
          <div className="text-[0.65rem] text-[#B69A5A] font-medium">
            {standardDiscount > 0 && <span>Standard: {standardDiscount}% off</span>}
            {standardDiscount > 0 && infinityDiscount > 0 && <span className="mx-1">·</span>}
            {infinityDiscount > 0 && <span>Infinity: {infinityDiscount}% off</span>}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">No items added yet.</p>
            <p className="text-xs mt-1 text-muted-foreground/70">Browse the catalog to add items.</p>
          </div>
        ) : (
          <div>
            {items.map((item) => {
              const effectivePrice = getEffectivePrice(item);
              const lineTotal = effectivePrice * item.quantity;

              return (
                <div
                  key={item.partCode}
                  className="border-b border-border px-3 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate leading-tight">
                        {item.description || item.partCode}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="part-code text-muted-foreground text-[0.7rem]">
                          {item.partCode}
                        </span>
                        {item.isNetPrice && <span className="net-badge">Net</span>}
                        {item.isInfinity && !item.isNetPrice && (
                          <span className="infinity-badge">∞</span>
                        )}
                      </div>
                      {cleanSize(item.size) && (
                        <span className="text-xs text-muted-foreground">
                          Size: {cleanSize(item.size)} · {item.unit}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.partCode)}
                      className="text-muted-foreground/50 hover:text-destructive transition-colors flex-shrink-0 mt-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Qty control */}
                    <div className="qty-control">
                      <button
                        onClick={() => updateQuantity(item.partCode, item.quantity - 1)}
                        className="qty-btn"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.partCode, parseInt(e.target.value) || 1)
                        }
                        className="qty-input"
                      />
                      <button
                        onClick={() => updateQuantity(item.partCode, item.quantity + 1)}
                        className="qty-btn"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-xs font-bold text-foreground">
                        {item.isNetPrice ? "NET" : `$${lineTotal.toFixed(2)}`}
                      </div>
                      {item.quantity > 1 && !item.isNetPrice && (
                        <div className="text-[0.6rem] text-muted-foreground">
                          ${effectivePrice.toFixed(2)} ea.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t border-border bg-white">
          {/* Total */}
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Total
            </span>
            <span className="text-sm font-black text-foreground">
              ${totalPrice.toFixed(2)}
            </span>
          </div>

          {/* Actions */}
          <div className="px-3 py-2.5 space-y-1.5">
            <button
              onClick={onSummary}
              className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold py-2 rounded transition-all"
            >
              <LayoutList className="w-3.5 h-3.5" />
              View Full Summary
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={onExport}
                className="flex items-center justify-center gap-1.5 bg-[#B69A5A] hover:bg-[#c9ae6d] text-black text-xs font-bold py-2 rounded transition-all"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
              <button
                onClick={onEmail}
                className="flex items-center justify-center gap-1.5 border border-[#B69A5A] text-[#B69A5A] hover:bg-[#B69A5A] hover:text-black text-xs font-bold py-2 rounded transition-all"
              >
                <Mail className="w-3 h-3" />
                Email
              </button>
            </div>
            <button
              onClick={clearOrder}
              className="w-full text-[0.65rem] text-muted-foreground hover:text-destructive transition-colors py-1"
            >
              Clear all items
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
