/**
 * Global cross-category search results.
 *
 * Active when the header search box is non-empty. Iterates every catalog
 * category and tab, applies the same punctuation-forgiving search the
 * scoped ProductTable uses, and renders matches grouped by Category › Tab.
 *
 * Each Category › Tab header is clickable — selecting it jumps the user
 * into that tab in normal browse mode (clearing the search).
 */

import { useMemo } from "react";
import { Plus, Minus, ArrowRight } from "lucide-react";
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
  profileGroup?: string | null;
  sectionHeading?: string;
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
  tabs: CatalogTab[];
};

type GlobalSearchResultsProps = {
  categories: CatalogCategory[];
  searchQuery: string;
  profileFilter: string[];
  onJumpToTab: (categoryId: string, tabId: string) => void;
};

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return `$${price.toFixed(2)}`;
}

export default function GlobalSearchResults({
  categories,
  searchQuery,
  profileFilter,
  onJumpToTab,
}: GlobalSearchResultsProps) {
  const { items: orderItems, addItem, updateQuantity, adjustQuantity, getEffectivePrice } = useOrder();

  const orderMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of orderItems) {
      map.set(item.partCode, item.quantity);
    }
    return map;
  }, [orderItems]);

  const results = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return { groups: [] as Array<{
      category: CatalogCategory;
      tabs: Array<{ tab: CatalogTab; items: CatalogItem[] }>;
    }>, totalCount: 0, categoryCount: 0 };

    const norm = (s: string) =>
      s.toLowerCase().replace(/[,/\\-]/g, " ").replace(/\s+/g, " ").trim();
    const q = norm(trimmed);

    const groups: Array<{
      category: CatalogCategory;
      tabs: Array<{ tab: CatalogTab; items: CatalogItem[] }>;
    }> = [];
    let totalCount = 0;

    for (const cat of categories) {
      const tabMatches: Array<{ tab: CatalogTab; items: CatalogItem[] }> = [];
      for (const tab of cat.tabs) {
        let items = tab.items.filter((item) => {
          const haystack = norm(
            `${item.partCode} ${item.description} ${item.size ?? ""}`
          );
          return haystack.includes(q);
        });
        if (profileFilter.length > 0) {
          items = items.filter(
            (item) => !item.profileGroup || profileFilter.includes(item.profileGroup)
          );
        }
        if (items.length > 0) {
          tabMatches.push({ tab, items });
          totalCount += items.length;
        }
      }
      if (tabMatches.length > 0) {
        groups.push({ category: cat, tabs: tabMatches });
      }
    }

    return { groups, totalCount, categoryCount: groups.length };
  }, [categories, searchQuery, profileFilter]);

  const handleAdd = (item: CatalogItem, category: CatalogCategory, tab: CatalogTab) => {
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

  if (results.totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <p className="text-sm">
          No items found for "{searchQuery}" across any category.
        </p>
      </div>
    );
  }

  const gridCols = "120px 1fr 80px 60px 110px 110px 100px";

  return (
    <div className="w-full">
      {/* Result count summary */}
      <div className="bg-[#B69A5A]/8 border-b border-[#B69A5A]/30 px-4 py-2 flex items-center gap-3">
        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-[#B69A5A]">
          Global Search
        </span>
        <span className="text-xs text-black/60">
          <strong className="text-black">{results.totalCount}</strong>{" "}
          {results.totalCount === 1 ? "match" : "matches"} across{" "}
          <strong className="text-black">{results.categoryCount}</strong>{" "}
          {results.categoryCount === 1 ? "category" : "categories"}
        </span>
      </div>

      {/* Column headers — sticky */}
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

      {/* Result groups */}
      {results.groups.map((group) => (
        <div key={group.category.id}>
          {/* Category header */}
          <div className="bg-gradient-to-r from-black to-[#1a1a1a] px-3 py-2.5 border-b border-[#B69A5A] flex items-center gap-2">
            {group.category.isNetPrice && (
              <span className="text-[0.6rem] font-bold uppercase tracking-widest text-black bg-[#f4ce47] px-1.5 py-0.5 rounded">
                Net
              </span>
            )}
            <span className="text-[0.75rem] font-bold uppercase tracking-widest text-[#B69A5A]">
              {group.category.name}
            </span>
            <span className="text-[0.65rem] text-white/40">
              ·{" "}
              {group.tabs.reduce((sum, t) => sum + t.items.length, 0)}{" "}
              {group.tabs.reduce((sum, t) => sum + t.items.length, 0) === 1
                ? "match"
                : "matches"}
            </span>
          </div>

          {/* Tab subsections */}
          {group.tabs.map(({ tab, items }) => (
            <div key={tab.id}>
              {/* Tab subheader — clickable jump */}
              <button
                onClick={() => onJumpToTab(group.category.id, tab.id)}
                title={`Jump to ${group.category.name} › ${tab.name}`}
                className="w-full flex items-center gap-2 px-3 py-1.5 bg-[#B69A5A]/10 hover:bg-[#B69A5A]/20 border-b border-[#B69A5A]/20 transition-colors group"
              >
                <div className="w-1 h-3 bg-[#B69A5A] rounded-full flex-shrink-0" />
                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-black/70">
                  {tab.name}
                </span>
                <span className="text-[0.6rem] text-black/40">
                  ({items.length})
                </span>
                <ArrowRight className="w-3 h-3 text-black/30 group-hover:text-[#B69A5A] group-hover:translate-x-0.5 transition-all ml-auto" />
              </button>

              {/* Item rows */}
              {items.map((item) => {
                const qty = orderMap.get(item.partCode) ?? 0;
                const inOrder = qty > 0;

                const tempItem: OrderItem = {
                  partCode: item.partCode,
                  description: item.description,
                  size: item.size,
                  unit: item.unit,
                  dealerPrice: item.dealerPrice,
                  listPrice: item.listPrice,
                  isNetPrice: group.category.isNetPrice,
                  isInfinity: group.category.isInfinity,
                  categoryName: group.category.name,
                  tabName: tab.name,
                  quantity: 1,
                };
                const effectivePrice = getEffectivePrice(tempItem);
                const showDiscount =
                  !group.category.isNetPrice &&
                  effectivePrice !== (item.dealerPrice ?? 0);

                return (
                  <div
                    key={`${tab.id}-${item.partCode}`}
                    className={`product-row grid ${inOrder ? "in-order" : ""}`}
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="part-code text-muted-foreground">
                          {item.partCode}
                        </span>
                        {group.category.isNetPrice && (
                          <span className="net-badge">Net</span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 pr-2">
                      <div className="text-xs text-foreground leading-snug">
                        {item.description || (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {cleanSize(item.size) || "—"}
                    </div>

                    <div className="text-xs text-muted-foreground">{item.unit}</div>

                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">
                        {group.category.isNetPrice
                          ? "NET"
                          : formatPrice(item.dealerPrice)}
                      </span>
                    </div>

                    <div className="text-right">
                      {group.category.isNetPrice ? (
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
                              disc.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center">
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAdd(item, group.category, tab)}
                          className="flex items-center gap-1 text-xs bg-[#B69A5A] hover:bg-[#c9ae6d] text-black font-bold px-2.5 py-1 rounded transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                      ) : (
                        <div className="qty-control">
                          <button
                            onClick={() => adjustQuantity(item.partCode, -1)}
                            className="qty-btn"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) =>
                              updateQuantity(
                                item.partCode,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="qty-input"
                          />
                          <button
                            onClick={() => adjustQuantity(item.partCode, 1)}
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
      ))}
    </div>
  );
}
