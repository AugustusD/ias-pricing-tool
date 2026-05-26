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

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [standardDiscount, setStandardDiscountState] = useState<number>(() => readLS(LS_STANDARD));
  const [infinityDiscount, setInfinityDiscountState] = useState<number>(() => readLS(LS_INFINITY));

  // Persist discounts to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem(LS_STANDARD, String(standardDiscount)); } catch {}
  }, [standardDiscount]);

  useEffect(() => {
    try { localStorage.setItem(LS_INFINITY, String(infinityDiscount)); } catch {}
  }, [infinityDiscount]);

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
