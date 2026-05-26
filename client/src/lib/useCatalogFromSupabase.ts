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
    sectionHeading: "",
  };
}

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
