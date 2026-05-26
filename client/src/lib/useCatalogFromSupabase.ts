import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
  catalogData as STATIC_STRUCTURE,
  type CatalogCategory,
  type CatalogItem,
} from "./catalogData";

/**
 * Row shape from public.products in Supabase.
 * Mirrors the migration 001_create_products_and_dealer_discount.sql schema.
 */
type SupabaseProduct = {
  identifier: string;
  list_price: number | null;
  price_type: "List" | "Net";
  product_series: "Standard" | "Infinity" | "Fasteners";
  profile: "Square" | "Round" | "Flat" | "Colonial" | "LOPRO" | null;
  descriptors: string[];
  per_unit: string | null;
  primary_category: string;
  primary_section: string;
  xltx_sheet: string | null;
};

/**
 * Map a Supabase row to the CatalogItem shape the existing components expect.
 *
 *   listPrice / dealerPrice both = list_price. Discounts are applied at runtime
 *   by OrderContext.getEffectivePrice() using the dealer's standardDiscount /
 *   infinityDiscount values, so we keep the base price here.
 */
function toCatalogItem(p: SupabaseProduct): CatalogItem {
  const description = p.descriptors.filter(Boolean).join(", ");
  const size = p.descriptors[5] || null;
  const type: CatalogItem["type"] =
    p.price_type === "Net"
      ? "net"
      : p.product_series === "Infinity"
        ? "infinity"
        : "standard";

  return {
    partCode: p.identifier,
    description,
    size,
    unit: p.per_unit ?? "Each",
    listPrice: p.list_price,
    dealerPrice: p.list_price,
    type,
    profileGroup: p.profile,
    sectionHeading:
      deriveFastenerSection(p) ?? deriveWallMountSection(p) ?? "",
  };
}

/**
 * The WM-BTM-MID-DBLRAIL sheet has items labeled just "Bottom" or "Double
 * Glass" in their descriptors. Dealers can't tell from that alone that the
 * "Bottom" wall mounts are the same extrusion used for mid-rail wall mounts
 * (Mike's call #1 — "bottom-rail + mid-rail wall mounts = same extrusion").
 *
 * Group them under a section heading that makes the dual purpose explicit.
 */
function deriveWallMountSection(p: SupabaseProduct): string | null {
  if (p.xltx_sheet !== "WM-BTM-MID-DBLRAIL") return null;
  const id = p.identifier;
  if (id.startsWith("PBWM")) return "Bottom & Mid-Rail Wall Mounts (same extrusion)";
  if (id.startsWith("PDWM")) return "Double-Rail Wall Mounts";
  if (id.startsWith("PPLT")) return "Wall Mount Plates";
  return "";
}

/**
 * Fasteners sheet has no profile groups and no explicit section headings.
 * Derive a section from the identifier prefix so painted screws group above
 * mill finish (Mike's call #2), with the misc accessory groups below.
 *
 * Returns null for non-fastener rows so existing behavior is unchanged.
 */
function deriveFastenerSection(p: SupabaseProduct): string | null {
  if (p.xltx_sheet !== "FASTENERS") return null;
  const id = p.identifier;
  if (id.startsWith("CHG")) return "Color Setup Charges";
  if (id.startsWith("PSC")) return "Painted Screws (Made To Order)";
  if (id.startsWith("RSC") && !id.includes("PLUG")) return "Mill Finish Screws";
  if (id.startsWith("RDBR")) return "Driver Bits";
  if (id.startsWith("RPLSCI") || id.includes("PLUG")) return "Insulators & Concrete Plugs";
  return "";
}

/** Sort rank for Fasteners sections — painted before mill finish, etc. */
const FASTENER_SECTION_RANK: Record<string, number> = {
  "Color Setup Charges": 0,
  "Painted Screws (Made To Order)": 1,
  "Mill Finish Screws": 2,
  "Driver Bits": 3,
  "Insulators & Concrete Plugs": 4,
  "": 99,
};

/**
 * Fetches all active products from Supabase, groups by `xltx_sheet`, and
 * merges them into the static category/tab structure so the existing UI
 * (Sidebar, Tabs, ProductTable, OrderPanel) keeps working unchanged.
 *
 * Returns { data, loading, error }. `data` always has the full nested
 * structure — tabs just have empty `items[]` while loading.
 */
export function useCatalogFromSupabase() {
  const [data, setData] = useState<CatalogCategory[]>(() =>
    STATIC_STRUCTURE.map((cat) => ({
      ...cat,
      // ProductTable / GlobalSearchResults read `isNetPrice`, catalogData
      // defines `isNet`. Alias here so net categories (Fasteners, Color
      // Options, Samples) actually skip the discount math.
      isNetPrice: cat.isNet ?? false,
      isInfinity: cat.isInfinity ?? false,
      tabs: cat.tabs.map((tab) => ({ ...tab, items: [] })),
    }))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: rows, error: queryError } = await supabase
        .from("products")
        .select(
          "identifier, list_price, price_type, product_series, profile, descriptors, per_unit, primary_category, primary_section, xltx_sheet"
        )
        .eq("is_active", true);

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const itemsBySheet = new Map<string, CatalogItem[]>();
      for (const row of (rows ?? []) as SupabaseProduct[]) {
        const key = row.xltx_sheet ?? "";
        if (!itemsBySheet.has(key)) itemsBySheet.set(key, []);
        itemsBySheet.get(key)!.push(toCatalogItem(row));
      }

      // Sort the FASTENERS bucket so painted screws come before mill finish,
      // then driver bits / insulators last. Items keep alphabetical order
      // within each section so size/spec runs stay stable.
      const fasteners = itemsBySheet.get("FASTENERS");
      if (fasteners) {
        fasteners.sort((a, b) => {
          const ra = FASTENER_SECTION_RANK[a.sectionHeading] ?? 99;
          const rb = FASTENER_SECTION_RANK[b.sectionHeading] ?? 99;
          if (ra !== rb) return ra - rb;
          return a.partCode.localeCompare(b.partCode);
        });
      }

      // LOPRO products come from `source_file='lopro'` rows with no xltx_sheet.
      // For now, slot them into the most appropriate xltx tabs by inferring
      // from the product code prefix. The existing static structure doesn't
      // have a separate "LOPRO" tab — they appear inside their kindred tabs
      // (e.g. Welded Picket 5/8" gets the PWPLPS* rows alongside PWPS*).
      // We do this by re-running the join with a fallback: if xltx_sheet is
      // null, use the Square equivalent's sheet.
      // [Implementation deferred — for now LOPRO rows land in itemsBySheet[""]
      //  and don't show. Mike's punch-list #12 will be addressed in a follow-up.]

      const filled = STATIC_STRUCTURE.map((cat) => ({
        ...cat,
        isNetPrice: cat.isNet ?? false,
        isInfinity: cat.isInfinity ?? false,
        tabs: cat.tabs.map((tab) => ({
          ...tab,
          items: itemsBySheet.get(tab.sheetName) ?? [],
        })),
      }));

      setData(filled);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
