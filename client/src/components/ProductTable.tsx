/**
 * IAS ProductTable Component
 * Design: Premium B2B Catalog — black/gold/white, Helvetica
 * Columns: Part Code | Description | Size | Unit | Dealer Price | Your Price | Qty
 * Grouping: Items sorted by top rail profile — Square, Round, Flat, Colonial (matching PDF order)
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

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return `$${price.toFixed(2)}`;
}

// Profile group order matching the PDF layout
const PROFILE_ORDER = ["Square", "Round", "Flat", "Colonial"];

/**
 * Detect which top rail profile group an item belongs to.
 * Returns the canonical group name or null for items that don't fit a profile group.
 */
function getProfileGroup(description: string): string | null {
  if (!description) return null;
  const d = description.trim();
  for (const profile of PROFILE_ORDER) {
    // Match "Square", "Square Top", "Square," at the start of the description
    const re = new RegExp(`^${profile}(\\s|,|$)`, "i");
    if (re.test(d)) return profile;
  }
  return null;
}

/**
 * Sort and group items by top rail profile (Square → Round → Flat → Colonial).
 * Items that don't belong to a profile group are placed at the end in their original order.
 */
function groupItemsByProfile(
  items: CatalogItem[]
): { groupLabel: string | null; items: CatalogItem[] }[] {
  // Check if any items have profile prefixes — if not, skip grouping
  const hasProfiles = items.some((item) => getProfileGroup(item.description) !== null);
  if (!hasProfiles) {
    return [{ groupLabel: null, items }];
  }

  // Bucket items into profile groups
  const buckets: Record<string, CatalogItem[]> = {};
  const ungrouped: CatalogItem[] = [];

  for (const item of items) {
    const group = getProfileGroup(item.description);
    if (group) {
      if (!buckets[group]) buckets[group] = [];
      buckets[group].push(item);
    } else {
      ungrouped.push(item);
    }
  }

  const result: { groupLabel: string | null; items: CatalogItem[] }[] = [];

  // Add profile groups in canonical order
  for (const profile of PROFILE_ORDER) {
    if (buckets[profile] && buckets[profile].length > 0) {
      result.push({ groupLabel: profile, items: buckets[profile] });
    }
  }

  // Append any remaining ungrouped items
  if (ungrouped.length > 0) {
    result.push({ groupLabel: null, items: ungrouped });
  }

  return result;
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

  const groups = useMemo(() => groupItemsByProfile(filteredItems), [filteredItems]);

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

  // Grid columns: Part Code | Description | Size | Unit | Dealer Price | Your Price | Qty
  const gridCols = "120px 1fr 80px 60px 110px 110px 100px";

  return (
    <div className="w-full">
      {/* Column headers */}
      <div
        className="sticky top-0 z-10 bg-white border-b-2 border-[#B69A5A] grid text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2"
        style={{ gridTemplateColumns: gridCols }}
      >
        <span>Part Code</span>
        <span>Description</span>
        <span>Size</span>
        <span>Unit</span>
        <span className="text-right">Dealer Price</span>
        <span className="text-right">Your Price</span>
        <span className="text-center">Qty</span>
      </div>

      {/* Profile groups */}
      {groups.map((group, gi) => (
        <div key={gi}>
          {/* Profile group header — only shown when there are multiple profile groups */}
          {group.groupLabel && groups.filter((g) => g.groupLabel !== null).length > 1 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-[#B69A5A]/30">
              <div className="w-1 h-4 bg-[#B69A5A] rounded-full flex-shrink-0" />
              <span className="text-[0.7rem] font-bold uppercase tracking-widest text-[#B69A5A]">
                {group.groupLabel}
              </span>
              <div className="flex-1 h-px bg-[#B69A5A]/20" />
              <span className="text-[0.65rem] text-muted-foreground">{group.items.length} items</span>
            </div>
          )}

          {/* Items in this group */}
          {group.items.map((item) => {
            const qty = orderMap.get(item.partCode) ?? 0;
            const inOrder = qty > 0;

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

            return (
              <div
                key={item.partCode}
                className={`product-row grid ${inOrder ? "in-order" : ""}`}
                style={{ gridTemplateColumns: gridCols }}
              >
                {/* Part Code — leftmost column */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="part-code text-muted-foreground">{item.partCode}</span>
                    {category.isNetPrice && (
                      <span className="net-badge">Net</span>
                    )}
                    {category.isInfinity && !category.isNetPrice && (
                      <span className="infinity-badge">∞</span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="min-w-0 pr-2">
                  <div className="text-xs text-foreground leading-snug">
                    {item.description || <span className="text-muted-foreground italic">—</span>}
                  </div>
                </div>

                {/* Size */}
                <div className="text-xs text-muted-foreground">{cleanSize(item.size) || "—"}</div>

                {/* Unit */}
                <div className="text-xs text-muted-foreground">{item.unit}</div>

                {/* Dealer Price */}
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">
                    {category.isNetPrice ? "NET" : formatPrice(item.dealerPrice)}
                  </span>
                </div>

                {/* Your Price (after discount) */}
                <div className="text-right">
                  {category.isNetPrice ? (
                    <span className="text-xs font-semibold text-foreground">
                      {formatPrice(item.dealerPrice)}
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
                        onChange={(e) =>
                          handleQtyChange(item.partCode, parseInt(e.target.value) || 0)
                        }
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
