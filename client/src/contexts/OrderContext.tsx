import React, { createContext, useContext, useState, useCallback } from "react";

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
  clearOrder: () => void;
  totalItems: number;
  totalPrice: number;
  standardDiscount: number;
  infinityDiscount: number;
  setStandardDiscount: (d: number) => void;
  setInfinityDiscount: (d: number) => void;
  getEffectivePrice: (item: OrderItem) => number;
};

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [standardDiscount, setStandardDiscount] = useState(0);
  const [infinityDiscount, setInfinityDiscount] = useState(0);

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
