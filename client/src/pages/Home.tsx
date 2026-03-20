/**
 * IAS Dealer Pricing Tool - Main Page
 * Design: Premium B2B Catalog
 * Colors: #B69A5A gold, black, grey, white, #f4ce47 highlight
 * Font: Helvetica Neue / Helvetica / Arial
 */

import { useState, useMemo, useCallback } from "react";
import { CATALOG_DATA } from "@/lib/catalogData";
import { useOrder } from "@/contexts/OrderContext";
import { exportToExcel, generateEmailBody } from "@/lib/exportUtils";
import { toast } from "sonner";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ProductTable from "@/components/ProductTable";
import OrderPanel from "@/components/OrderPanel";
import OrderSummaryModal from "@/components/OrderSummaryModal";

export default function Home() {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(CATALOG_DATA[0].id);
  const [activeTabId, setActiveTabId] = useState<string>(CATALOG_DATA[0].tabs[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { items: orderItems, totalItems, totalPrice, getEffectivePrice, standardDiscount, infinityDiscount } = useOrder();

  const activeCategory = useMemo(
    () => CATALOG_DATA.find((c) => c.id === activeCategoryId) ?? CATALOG_DATA[0],
    [activeCategoryId]
  );

  const activeTab = useMemo(
    () => activeCategory.tabs.find((t) => t.id === activeTabId) ?? activeCategory.tabs[0],
    [activeCategory, activeTabId]
  );

  const handleCategorySelect = useCallback((catId: string) => {
    setActiveCategoryId(catId);
    const cat = CATALOG_DATA.find((c) => c.id === catId);
    if (cat && cat.tabs.length > 0) {
      setActiveTabId(cat.tabs[0].id);
    }
    setSearchQuery("");
  }, []);

  const handleExport = useCallback(() => {
    if (orderItems.length === 0) {
      toast.error("No items in order to export.");
      return;
    }
    exportToExcel(orderItems, getEffectivePrice, standardDiscount, infinityDiscount);
    toast.success("Order exported to Excel!");
  }, [orderItems, getEffectivePrice, standardDiscount, infinityDiscount]);

  const handleEmail = useCallback(() => {
    if (orderItems.length === 0) {
      toast.error("No items in order to email.");
      return;
    }
    const body = generateEmailBody(orderItems, getEffectivePrice, standardDiscount, infinityDiscount);
    const subject = encodeURIComponent("IAS Dealer Order Inquiry");
    const encodedBody = encodeURIComponent(body);
    window.location.href = `mailto:?subject=${subject}&body=${encodedBody}`;
  }, [orderItems, getEffectivePrice, standardDiscount, infinityDiscount]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <Header
        totalItems={totalItems}
        totalPrice={totalPrice}
        onOrderPanelToggle={() => setOrderPanelOpen(!orderPanelOpen)}
        onExport={handleExport}
        onEmail={handleEmail}
        onSummary={() => setSummaryModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          categories={CATALOG_DATA as any}
          activeCategoryId={activeCategoryId}
          onCategorySelect={handleCategorySelect}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Content area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Category title bar */}
          <div className="bg-white border-b border-border px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              {activeCategory.isInfinity && (
                <span className="infinity-badge">Infinity</span>
              )}
              {activeCategory.isNetPrice && (
                <span className="net-badge">Net Price</span>
              )}
              <h2 className="font-bold text-sm uppercase tracking-widest text-foreground">
                {activeCategory.name}
              </h2>
            </div>
            {/* Tab bar */}
            {activeCategory.tabs.length > 1 && (
              <div className="flex gap-1 overflow-x-auto ml-2 flex-1">
                {activeCategory.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`ias-tab ${activeTabId === tab.id ? "active" : ""}`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product table */}
          <div className="flex-1 overflow-auto">
            {activeTab && (
              <ProductTable
                tab={activeTab as any}
                category={activeCategory as any}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </main>

        {/* Order panel */}
        {orderPanelOpen && (
          <OrderPanel
            onClose={() => setOrderPanelOpen(false)}
            onExport={handleExport}
            onEmail={handleEmail}
            onSummary={() => setSummaryModalOpen(true)}
          />
        )}
      </div>

      {/* Summary modal */}
      {summaryModalOpen && (
        <OrderSummaryModal
          onClose={() => setSummaryModalOpen(false)}
          onExport={handleExport}
          onEmail={handleEmail}
        />
      )}
    </div>
  );
}
