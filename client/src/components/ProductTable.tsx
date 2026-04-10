/**
 * IAS ProductTable Component
 * Displays product rows with quantity controls and pricing
 * Handles search filtering, section headers, and order integration
 */

import { useMemo } from "react";
import { Plus, Minus } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import type { OrderItem } from "@/contexts/OrderContext";
import { cleanSize } from "@/lib/exportUtils";

type CatalogItem = {
  description: string;
  size: string | null;
  unit: string;
  partCode: string;
  listPrice: number | null;
  dealerPrice: number | null;
};

type CatalogTab = {
  id: string;
  name: string;
  sheetName: string;
  items: CatalogItem[];
};

type CatalogCategory = {
  id: string;
  name: string;
  isInfinity: boolean;
  isNetPrice: boolean;
};

type ProductTableProps = {
  tab: CatalogTab;
  category: CatalogCategory;
  searchQuery: string;
};

function formatPrice(price: number | null, isNet: boolean): string {
  if (price === null) return "—";
  return `$${price.toFixed(2)}`;
}

export default function ProductTable({ tab, category, searchQuery }: ProductTableProps) {
  const { items: orderItems, addItem, updateQuantity, getEffectivePrice } = useOrder();

  const orderMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of orderItems) {
      map.set(item.partCode, item.quantity);
    }
    return map;
  }, [orderItems]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return tab.items;
    const q = searchQuery.toLowerCase();
    return tab.items.filter(
      (item) =>
        item.partCode.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.size && item.size.toLowerCase().includes(q))
    );
  }, [tab.items, searchQuery]);

  const handleAdd = (item: CatalogItem) => {
    const orderItem: Omit<OrderItem, "quantity"> = {
      partCode: item.partCode,
      description: item.description,
      size: item.size,
      unit: item.unit,
      dealerPrice: item.dealerPrice,
      listPrice: item.listPrice,
      isNetPrice: category.isNetPrice,
      isInfinity: category.isInfinity,
      categoryName: category.name,
      tabName: tab.name,
    };
    addItem(orderItem);
  };

  const handleQtyChange = (partCode: string, qty: number) => {
    updateQuantity(partCode, qty);
  };

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <p className="text-sm">No items found{searchQuery ? ` for "${searchQuery}"` : ""}.</p>
      </div>
    );
  }

  // Group items by description to create visual sections
  // Items with empty description continue the previous group
  const groupedItems: { header: string | null; items: CatalogItem[] }[] = [];
  let currentGroup: { header: string | null; items: CatalogItem[] } | null = null;

  for (const item of filteredItems) {
    const hasDesc = item.description && item.description.trim() !== "";
    if (hasDesc) {
      // Check if this is a new section (different description from last group header)
      if (!currentGroup || currentGroup.header !== item.description) {
        currentGroup = { header: item.description, items: [item] };
        groupedItems.push(currentGroup);
      } else {
        currentGroup.items.push(item);
      }
    } else if (currentGroup) {
      currentGroup.items.push(item);
    } else {
      currentGroup = { header: null, items: [item] };
      groupedItems.push(currentGroup);
    }
  }

  return (
    <div className="w-full">
      {/* Column headers */}
      <div
        className="sticky top-0 z-10 bg-white border-b-2 border-[#B69A5A] grid text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2"
        style={{ gridTemplateColumns: "1fr 90px 60px 110px 110px 100px" }}
      >
        <span>Description / Part Code</span>
        <span>Size</span>
        <span>Unit</span>
        <span className="text-right">Dealer Price</span>
        <span className="text-right">Your Price</span>
        <span className="text-center">Qty</span>
      </div>

      {/* Items */}
      {groupedItems.map((group, gi) => (
        <div key={gi}>
          {group.items.map((item, ii) => {
            const qty = orderMap.get(item.partCode) ?? 0;
            const inOrder = qty > 0;

            // Create a temporary order item to calculate effective price
            const tempItem: OrderItem = {
              partCode: item.partCode,
              description: item.description,
              size: item.size,
              unit: item.unit,
              dealerPrice: item.dealerPrice,
              listPrice: item.listPrice,
              isNetPrice: category.isNetPrice,
              isInfinity: category.isInfinity,
              categoryName: category.name,
              tabName: tab.name,
              quantity: 1,
            };
            const effectivePrice = getEffectivePrice(tempItem);
            const showDiscount = !category.isNetPrice && effectivePrice !== (item.dealerPrice ?? 0);
            // Show description only on first item of group
            const showDesc = ii === 0 && group.header;

            return (
              <div
                key={item.partCode}
                className={`product-row grid ${inOrder ? "in-order" : ""}`}
                style={{ gridTemplateColumns: "1fr 90px 60px 110px 110px 100px" }}
              >
                {/* Description + Part Code */}
                <div className="min-w-0">
                  {showDesc && (
                    <div className="text-xs font-semibold text-foreground truncate leading-tight mb-0.5">
                      {group.header}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="part-code text-muted-foreground">{item.partCode}</span>
                    {category.isNetPrice && (
                      <span className="net-badge">Net</span>
                    )}
                    {category.isInfinity && !category.isNetPrice && (
                      <span className="infinity-badge">∞</span>
                    )}
                  </div>
                </div>

                {/* Size */}
                <div className="text-xs text-muted-foreground">{cleanSize(item.size) || "—"}</div>

                {/* Unit */}
                <div className="text-xs text-muted-foreground">{item.unit}</div>

                {/* Dealer Price */}
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">
                    {category.isNetPrice ? "NET" : formatPrice(item.dealerPrice, false)}
                  </span>
                </div>

                {/* Your Price (after discount) */}
                <div className="text-right">
                  {category.isNetPrice ? (
                    <span className="text-xs font-semibold text-foreground">
                      {formatPrice(item.dealerPrice, true)}
                    </span>
                  ) : (
                    <div>
                      <span className="text-xs font-semibold text-foreground">
                        ${effectivePrice.toFixed(2)}
                      </span>
                      {showDiscount && (
                        <div className="text-[0.6rem] text-[#B69A5A] font-medium">
                          {category.isInfinity ? "∞ disc." : "disc."}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quantity control */}
                <div className="flex items-center justify-center">
                  {qty === 0 ? (
                    <button
                      onClick={() => handleAdd(item)}
                      className="flex items-center gap-1 text-xs bg-[#B69A5A] hover:bg-[#c9ae6d] text-black font-bold px-2.5 py-1 rounded transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  ) : (
                    <div className="qty-control">
                      <button
                        onClick={() => handleQtyChange(item.partCode, qty - 1)}
                        className="qty-btn"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={(e) => handleQtyChange(item.partCode, parseInt(e.target.value) || 0)}
                        className="qty-input"
                      />
                      <button
                        onClick={() => handleQtyChange(item.partCode, qty + 1)}
                        className="qty-btn"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
