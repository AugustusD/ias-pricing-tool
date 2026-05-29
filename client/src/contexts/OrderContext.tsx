import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type OrderItem = {
  partCode: string;
  description: string;
  size: string | null;
  unit: string;
  dealerPrice: number | null;
  listPrice: number | null;
  quantity: number;
  isNetPrice: boolean;
  isInfinity: boolean;
  categoryName: string;
  tabName: string;
};

type OrderContextType = {
  items: OrderItem[];
  addItem: (item: Omit<OrderItem, "quantity">) => void;
  removeItem: (partCode: string) => void;
  updateQuantity: (partCode: string, quantity: number) => void;
  /** Increment/decrement by delta. Reads current qty from latest state so
   *  rapid clicks compose correctly (won't drop updates from stale closures). */
  adjustQuantity: (partCode: string, delta: number) => void;
  clearOrder: () => void;
  totalItems: number;
  totalPrice: number;
  standardDiscount: number;
  infinityDiscount: number;
  setStandardDiscount: (d: number) => void;
  setInfinityDiscount: (d: number) => void;
  /** True when EITHER discount was supplied by the Dealer Portal via URL
   *  hash. Header uses this for the "Set by IAS" tagline. The two per-field
   *  flags below are what drive each individual input's read-only state —
   *  the portal may set only one of the two (e.g. dealer has Infinity
   *  discount but no Standard yet), and the unlocked field should remain
   *  editable. */
  discountLocked: boolean;
  standardLocked: boolean;
  infinityLocked: boolean;
  getEffectivePrice: (item: OrderItem) => number;
};

const LS_STANDARD = "ias_standard_discount";
const LS_INFINITY = "ias_infinity_discount";

function readLS(key: string): number {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
  } catch {
    return 0;
  }
}

// Read the dealer's discounts from the URL hash, dropped here by the Dealer
// Portal's Order Sheets tile. Format: #std=33.5&inf=43.5 (percentages, 0-100).
// Either key may be absent — the portal only emits values for discount
// columns that are actually set on the dealer. A missing key means "fall
// back to localStorage / 0 and DON'T lock that field" rather than "set
// this field to 0 and lock it". Returns null if neither key is present.
function readHashDiscounts(): { standard: number | null; infinity: number | null } | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(raw);
  const std = params.get("std");
  const inf = params.get("inf");
  if (std === null && inf === null) return null;
  function parseClamped(s: string | null): number | null {
    if (s === null) return null;
    const n = parseFloat(s);
    if (!Number.isFinite(n)) return null;
    return Math.min(100, Math.max(0, n));
  }
  return {
    standard: parseClamped(std),
    infinity: parseClamped(inf),
  };
}

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);

  // Hash discounts win over localStorage. The portal only emits keys for
  // discount columns the dealer actually has set, so a missing key here
  // means "no admin value — let the dealer enter their own" rather than
  // "lock at 0". discountLocked is therefore per-field. Either being true
  // means we treat this session as admin-managed.
  const hashDiscounts = readHashDiscounts();
  const [standardLocked] = useState<boolean>(hashDiscounts?.standard != null);
  const [infinityLocked] = useState<boolean>(hashDiscounts?.infinity != null);
  const discountLocked = standardLocked || infinityLocked;
  const [standardDiscount, setStandardDiscountState] = useState<number>(
    () => hashDiscounts?.standard ?? readLS(LS_STANDARD)
  );
  const [infinityDiscount, setInfinityDiscountState] = useState<number>(
    () => hashDiscounts?.infinity ?? readLS(LS_INFINITY)
  );

  // Persist discounts to localStorage whenever they change — but ONLY for
  // fields the dealer can actually edit. A locked (admin-set) field should
  // not overwrite the dealer's previously-saved manual value, otherwise a
  // later standalone visit (no hash) would load the admin number instead
  // of what the dealer last typed.
  useEffect(() => {
    if (standardLocked) return;
    try { localStorage.setItem(LS_STANDARD, String(standardDiscount)); } catch {}
  }, [standardDiscount, standardLocked]);

  useEffect(() => {
    if (infinityLocked) return;
    try { localStorage.setItem(LS_INFINITY, String(infinityDiscount)); } catch {}
  }, [infinityDiscount, infinityLocked]);

  const setStandardDiscount = useCallback((d: number) => {
    setStandardDiscountState(Math.min(100, Math.max(0, d)));
  }, []);

  const setInfinityDiscount = useCallback((d: number) => {
    setInfinityDiscountState(Math.min(100, Math.max(0, d)));
  }, []);

  const getEffectivePrice = useCallback(
    (item: OrderItem): number => {
      if (item.isNetPrice || item.dealerPrice === null) return item.dealerPrice ?? 0;
      const discount = item.isInfinity ? infinityDiscount : standardDiscount;
      const multiplier = 1 - discount / 100;
      return (item.dealerPrice ?? 0) * multiplier;
    },
    [standardDiscount, infinityDiscount]
  );

  const addItem = useCallback((newItem: Omit<OrderItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.partCode === newItem.partCode);
      if (existing) {
        return prev.map((i) =>
          i.partCode === newItem.partCode ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((partCode: string) => {
    setItems((prev) => prev.filter((i) => i.partCode !== partCode));
  }, []);

  const updateQuantity = useCallback((partCode: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.partCode !== partCode));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.partCode === partCode ? { ...i, quantity } : i))
      );
    }
  }, []);

  const adjustQuantity = useCallback((partCode: string, delta: number) => {
    setItems((prev) => {
      const next = prev
        .map((i) =>
          i.partCode === partCode ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0);
      return next;
    });
  }, []);

  const clearOrder = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + getEffectivePrice(i) * i.quantity,
    0
  );

  return (
    <OrderContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        adjustQuantity,
        clearOrder,
        totalItems,
        totalPrice,
        standardDiscount,
        infinityDiscount,
        setStandardDiscount,
        setInfinityDiscount,
        discountLocked,
        standardLocked,
        infinityLocked,
        getEffectivePrice,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
}
