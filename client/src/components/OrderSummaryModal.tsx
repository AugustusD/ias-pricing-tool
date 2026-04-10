/**
 * IAS OrderSummaryModal Component
 * Full-screen modal showing complete order summary with grouped items
 */

import { X, Download, Mail, Trash2 } from "lucide-react";
import { cleanSize } from "@/lib/exportUtils";
import { useOrder } from "@/contexts/OrderContext";
import type { OrderItem } from "@/contexts/OrderContext";

type OrderSummaryModalProps = {
  onClose: () => void;
  onExport: () => void;
  onEmail: () => void;
};

export default function OrderSummaryModal({ onClose, onExport, onEmail }: OrderSummaryModalProps) {
  const {
    items,
    removeItem,
    updateQuantity,
    totalItems,
    totalPrice,
    getEffectivePrice,
    clearOrder,
    standardDiscount,
    infinityDiscount,
  } = useOrder();

  // Group by category
  const grouped = items.reduce<Record<string, OrderItem[]>>((acc, item) => {
    const key = item.categoryName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="bg-[#1a1a1a] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-[#B69A5A] text-[0.6rem] font-bold uppercase tracking-widest">
              Innovative Aluminum Systems
            </div>
            <h2 className="text-white text-lg font-bold mt-0.5">Order Summary</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Discount info bar */}
        <div className="bg-[#f8f7f5] border-b border-border px-6 py-2.5 flex items-center gap-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Date:</span>
            <span className="text-xs font-medium">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Standard Discount:</span>
            <span className="text-xs font-bold text-[#B69A5A]">{standardDiscount}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Infinity Discount:</span>
            <span className="text-xs font-bold text-[#B69A5A]">{infinityDiscount}%</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">Items:</span>
            <span className="text-xs font-bold">{totalItems}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <p className="text-sm">No items in order.</p>
              <p className="text-xs mt-1">Browse the catalog and add items to your order.</p>
            </div>
          ) : (
            <div>
              {Object.entries(grouped).map(([catName, catItems]) => {
                const catTotal = catItems.reduce(
                  (sum, item) => sum + getEffectivePrice(item) * item.quantity,
                  0
                );

                return (
                  <div key={catName} className="border-b border-border">
                    {/* Category header */}
                    <div className="bg-[#f8f7f5] px-6 py-2 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                        {catName}
                      </span>
                      <span className="text-xs font-bold text-[#B69A5A]">
                        ${catTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Column headers */}
                    <div
                      className="grid px-6 py-1.5 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50 bg-white"
                      style={{ gridTemplateColumns: "1fr 90px 60px 60px 110px 110px 36px" }}
                    >
                      <span>Description / Part Code</span>
                      <span>Size</span>
                      <span>Unit</span>
                      <span className="text-center">Qty</span>
                      <span className="text-right">Dealer Price</span>
                      <span className="text-right">Line Total</span>
                      <span />
                    </div>

                    {/* Items */}
                    {catItems.map((item) => {
                      const effectivePrice = getEffectivePrice(item);
                      const lineTotal = effectivePrice * item.quantity;

                      return (
                        <div
                          key={item.partCode}
                          className="grid px-6 py-2 border-b border-border/30 hover:bg-[#f8f7f5]/50 transition-colors items-center"
                          style={{ gridTemplateColumns: "1fr 90px 60px 60px 110px 110px 36px" }}
                        >
                          {/* Description */}
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">
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
                          </div>

                          {/* Size */}
                          <div className="text-xs text-muted-foreground">{cleanSize(item.size) || "—"}</div>

                          {/* Unit */}
                          <div className="text-xs text-muted-foreground">{item.unit}</div>

                          {/* Qty */}
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(item.partCode, parseInt(e.target.value) || 1)
                              }
                              className="qty-input"
                            />
                          </div>

                          {/* Dealer Price */}
                          <div className="text-right">
                            <span className="text-xs font-medium text-foreground">
                              {item.isNetPrice ? "NET" : `$${effectivePrice.toFixed(2)}`}
                            </span>
                          </div>

                          {/* Line Total */}
                          <div className="text-right">
                            <span className="text-xs font-bold text-foreground">
                              {item.isNetPrice ? "NET" : `$${lineTotal.toFixed(2)}`}
                            </span>
                          </div>

                          {/* Remove */}
                          <div className="flex justify-center">
                            <button
                              onClick={() => removeItem(item.partCode)}
                              className="text-muted-foreground/40 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[0.6rem] text-muted-foreground uppercase tracking-widest">Grand Total</div>
              <div className="text-xl font-black text-foreground">${totalPrice.toFixed(2)}</div>
              <div className="text-[0.6rem] text-muted-foreground">
                * Net price items not included in total
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={() => { clearOrder(); onClose(); }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-2"
              >
                Clear Order
              </button>
            )}
            <button
              onClick={onEmail}
              className="flex items-center gap-2 border border-[#B69A5A] text-[#B69A5A] hover:bg-[#B69A5A] hover:text-black text-xs font-bold px-4 py-2.5 rounded transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              Create Email
            </button>
            <button
              onClick={onExport}
              className="flex items-center gap-2 bg-[#B69A5A] hover:bg-[#c9ae6d] text-black text-xs font-bold px-4 py-2.5 rounded transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export to Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
