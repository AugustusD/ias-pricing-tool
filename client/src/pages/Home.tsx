/**
 * IAS Dealer Pricing Tool - Main Page
 * Design: Premium B2B Catalog
 * Colors: #B69A5A gold, black, grey, white, #f4ce47 highlight
 * Font: Helvetica Neue / Helvetica / Arial
 */

import { useState, useMemo, useCallback } from "react";
import { X, RotateCcw, Search } from "lucide-react";
import { catalogData as CATALOG_DATA, type CatalogCategory } from "@/lib/catalogData";
import { useOrder } from "@/contexts/OrderContext";
import { exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ProductTable from "@/components/ProductTable";
import OrderPanel from "@/components/OrderPanel";
import OrderSummaryModal from "@/components/OrderSummaryModal";
import EmailPreviewModal from "@/components/EmailPreviewModal";

export default function Home() {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(CATALOG_DATA[0].id);
  const [activeTabId, setActiveTabId] = useState<string>(CATALOG_DATA[0].tabs[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const { items: orderItems, totalItems, totalPrice, getEffectivePrice, standardDiscount, infinityDiscount, clearOrder } = useOrder();

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
    setEmailModalOpen(true);
  }, [orderItems.length]);

  const handleReset = useCallback(() => {
    if (orderItems.length === 0) {
      toast.info("Order is already empty.");
      return;
    }
    if (resetConfirm) {
      clearOrder();
      setResetConfirm(false);
      toast.success("Order cleared.");
    } else {
      setResetConfirm(true);
      // Auto-cancel confirm state after 3s
      setTimeout(() => setResetConfirm(false), 3000);
    }
  }, [orderItems.length, resetConfirm, clearOrder]);

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
        onReset={handleReset}
        resetConfirm={resetConfirm}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClear={() => setSearchQuery("")}
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
          {/* Category title + tab bar */}
          <div className="bg-white border-b border-border px-4 pt-2.5 pb-0 flex-shrink-0">
            {/* Category name row */}
            <div className="flex items-center gap-2 mb-2">
              {activeCategory.isInfinity && (
                <span className="infinity-badge">Infinity</span>
              )}
              {activeCategory.isNet && (
                <span className="net-badge">Net Price</span>
              )}
              <h2 className="font-bold text-sm uppercase tracking-widest text-foreground">
                {activeCategory.name}
              </h2>
            </div>

            {/* Tab bar — wraps naturally, no horizontal scroll */}
            {activeCategory.tabs.length > 1 && (
              <div className="flex flex-wrap gap-1 pb-0">
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

          {/* Search results banner (shown when searching) */}
          {searchQuery.trim() && (
            <div className="bg-[#f4ce47]/15 border-b border-[#f4ce47]/40 px-4 py-1.5 flex items-center gap-2 flex-shrink-0">
              <Search className="w-3.5 h-3.5 text-black/50" />
              <span className="text-xs text-black/60">
                Showing results for <strong className="text-black">"{searchQuery}"</strong> in {activeCategory.name} › {activeTab?.name}
              </span>
              <button
                onClick={() => setSearchQuery("")}
                className="ml-auto text-xs text-black/50 hover:text-black flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
          )}

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

      {/* Email preview modal */}
      {emailModalOpen && (
        <EmailPreviewModal onClose={() => setEmailModalOpen(false)} />
      )}
    </div>
  );
}
