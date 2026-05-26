/**
 * IAS ProductTable Component
 * Design: Premium B2B Catalog — black/gold/white, Helvetica
 * Columns: Part Code | Description | Size | Unit | Dealer Price | Your Price | Qty
 *
 * Grouping strategy:
 * - If items have profileGroup: group by profile in order Square → Round → Flat → Colonial
 * - Within each profile group, show sectionHeading separators when they change
 * - If no profileGroup: show sectionHeading separators only
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
};

type ProductTableProps = {
  tab: CatalogTab;
  category: CatalogCategory;
  searchQuery: string;
  /** Multi-select profile filter — empty array means show all. Items with no
   *  profileGroup (standalone sections) are always shown. */
  profileFilter?: string[];
};

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return `$${price.toFixed(2)}`;
}

// Profile group order matching the PDF layout
const PROFILE_ORDER = ["Square", "Round", "Flat", "Colonial", "LOPRO", "1.9\" Pipe Rail"];

export default function ProductTable({ tab, category, searchQuery, profileFilter }: ProductTableProps) {
  const { items: orderItems, addItem, updateQuantity, adjustQuantity, getEffectivePrice } = useOrder();

  const orderMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of orderItems) {
      map.set(item.partCode, item.quantity);
    }
    return map;
  }, [orderItems]);

  const filteredItems = useMemo(() => {
    let items = tab.items;
    // Apply text search — punctuation-forgiving: strip commas, slashes, and
    // collapse extra whitespace from both the query and the searchable text
    // before substring-matching. So "center sleeve" matches "Center, Sleeve"
    // and "wp 5/8" matches "WP-5/8" or "WP, 5/8".
    if (searchQuery.trim()) {
      const norm = (s: string) =>
        s.toLowerCase().replace(/[,/\\-]/g, " ").replace(/\s+/g, " ").trim();
      const q = norm(searchQuery);
      items = items.filter((item) => {
        const haystack = norm(
          `${item.partCode} ${item.description} ${item.size ?? ""}`
        );
        return haystack.includes(q);
      });
    }
    // Apply profile filter: keep items whose profileGroup is in the selected
    // set, AND keep items with no profileGroup (standalone sections like
    // Post Mount Plates) regardless of selection. Empty array → no filter.
    if (profileFilter && profileFilter.length > 0) {
      items = items.filter(
        (item) => !item.profileGroup || profileFilter.includes(item.profileGroup)
      );
    }
    return items;
  }, [tab.items, searchQuery, profileFilter]);

  // Determine if this tab uses profile grouping
  const hasProfiles = useMemo(
    () => filteredItems.some((item) => item.profileGroup && item.profileGroup !== null),
    [filteredItems]
  );

  // Build display groups
  type DisplayGroup = {
    profileLabel: string | null;
    sectionLabel: string | null;
    items: CatalogItem[];
  };

  const displayGroups = useMemo((): DisplayGroup[] => {
    if (hasProfiles) {
      // Group by profile first, then by sectionHeading within each profile
      const profileBuckets: Record<string, CatalogItem[]> = {};
      const noProfileItems: CatalogItem[] = [];

      for (const item of filteredItems) {
        const p = item.profileGroup ?? null;
        if (p) {
          if (!profileBuckets[p]) profileBuckets[p] = [];
          profileBuckets[p].push(item);
        } else {
          noProfileItems.push(item);
        }
      }

      const result: DisplayGroup[] = [];

      // Add profile groups in canonical order
      for (const profile of PROFILE_ORDER) {
        const bucket = profileBuckets[profile];
        if (!bucket || bucket.length === 0) continue;

        // Within this profile, split by sectionHeading
        const sectionBuckets: { label: string; items: CatalogItem[] }[] = [];
        let currentSection = "";
        let currentBucket: CatalogItem[] = [];

        for (const item of bucket) {
          const sh = item.sectionHeading ?? "";
          if (sh !== currentSection) {
            if (currentBucket.length > 0) {
              sectionBuckets.push({ label: currentSection, items: currentBucket });
            }
            currentSection = sh;
            currentBucket = [item];
          } else {
            currentBucket.push(item);
          }
        }
        if (currentBucket.length > 0) {
          sectionBuckets.push({ label: currentSection, items: currentBucket });
        }

        // If only one section with no label, emit as single group
        if (sectionBuckets.length === 1 && !sectionBuckets[0].label) {
          result.push({ profileLabel: profile, sectionLabel: null, items: sectionBuckets[0].items });
        } else {
          for (const sb of sectionBuckets) {
            result.push({ profileLabel: profile, sectionLabel: sb.label || null, items: sb.items });
          }
        }
      }

      // Append any items without a profile — group by sectionHeading so standalone
      // sections like "Post Mount Plates" render their header correctly even in a
      // tab that also has profile groups.
      if (noProfileItems.length > 0) {
        let npSection = "";
        let npBucket: CatalogItem[] = [];
        for (const item of noProfileItems) {
          const sh = item.sectionHeading ?? "";
          if (sh !== npSection) {
            if (npBucket.length > 0) {
              result.push({ profileLabel: null, sectionLabel: npSection || null, items: npBucket });
            }
            npSection = sh;
            npBucket = [item];
          } else {
            npBucket.push(item);
          }
        }
        if (npBucket.length > 0) {
          result.push({ profileLabel: null, sectionLabel: npSection || null, items: npBucket });
        }
      }

      return result;
    } else {
      // No profiles — group by sectionHeading only
      const result: DisplayGroup[] = [];
      let currentSection = "";
      let currentBucket: CatalogItem[] = [];

      for (const item of filteredItems) {
        const sh = item.sectionHeading ?? "";
        if (sh !== currentSection) {
          if (currentBucket.length > 0) {
            result.push({ profileLabel: null, sectionLabel: currentSection || null, items: currentBucket });
          }
          currentSection = sh;
          currentBucket = [item];
        } else {
          currentBucket.push(item);
        }
      }
      if (currentBucket.length > 0) {
        result.push({ profileLabel: null, sectionLabel: currentSection || null, items: currentBucket });
      }

      return result;
    }
  }, [filteredItems, hasProfiles]);

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

  // Track which profile labels we've already shown (for deduplication)
  let lastProfileLabel: string | null = null;

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

      {/* Display groups */}
      {displayGroups.map((group, gi) => {
        const showProfileHeader =
          group.profileLabel !== null && group.profileLabel !== lastProfileLabel;
        if (group.profileLabel !== null) lastProfileLabel = group.profileLabel;

        return (
          <div key={gi}>
            {/* Profile group header */}
            {showProfileHeader && (
              <div className="flex items-center gap-2 px-3 py-2 bg-black border-b border-[#B69A5A]">
                <div className="w-1 h-4 bg-[#B69A5A] rounded-full flex-shrink-0" />
                <span className="text-[0.7rem] font-bold uppercase tracking-widest text-[#B69A5A]">
                  {group.profileLabel} Top Rail
                </span>
                <div className="flex-1 h-px bg-[#B69A5A]/30" />
              </div>
            )}

            {/* Section heading separator (within a profile or for non-profile sheets) */}
            {group.sectionLabel && (
              <div className="flex items-center gap-2 px-3 py-2 bg-black border-b border-[#B69A5A]">
                <div className="w-1 h-4 bg-[#B69A5A] rounded-full flex-shrink-0" />
                <span className="text-[0.7rem] font-bold uppercase tracking-widest text-[#B69A5A]">
                  {group.sectionLabel}
                </span>
                <div className="flex-1 h-px bg-[#B69A5A]/30" />
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
                            disc.
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
                            handleQtyChange(item.partCode, parseInt(e.target.value) || 0)
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
        );
      })}
    </div>
  );
}
