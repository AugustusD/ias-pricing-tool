/**
 * IAS Sidebar Component
 * Black sidebar with gold active indicator, category navigation.
 * Supports optional section group labels (e.g. "Posts", "Parts") for visual separation.
 */

import {
  Grid3X3, Square, Columns2, Minus, DoorOpen, Infinity, Wrench, Palette, BookOpen,
  ChevronLeft, ChevronRight, PanelTop
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  icon: string;
  isInfinity: boolean;
  isNetPrice: boolean;
  tabs: { id: string; name: string; items: unknown[] }[];
};

type SidebarProps = {
  categories: Category[];
  activeCategoryId: string;
  onCategorySelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

const ICON_MAP: Record<string, React.ReactNode> = {
  Grid3x3: <Grid3X3 className="w-4 h-4" />,
  Square: <Square className="w-4 h-4" />,
  Columns: <Columns2 className="w-4 h-4" />,
  Minus: <Minus className="w-4 h-4" />,
  DoorOpen: <DoorOpen className="w-4 h-4" />,
  Infinity: <Infinity className="w-4 h-4" />,
  Wrench: <Wrench className="w-4 h-4" />,
  Palette: <Palette className="w-4 h-4" />,
  BookOpen: <BookOpen className="w-4 h-4" />,
  PanelTop: <PanelTop className="w-4 h-4" />,
};

// Define which category IDs get a divider label above them
const SECTION_LABELS: Record<string, string> = {
  "posts": "Posts & Parts",
  "handrail": "Accessories",
  "infinity": "Infinity Series",
  "fasteners": "Net Price Items",
};

export default function Sidebar({
  categories,
  activeCategoryId,
  onCategorySelect,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className="ias-sidebar flex-shrink-0 flex flex-col transition-all duration-200 relative"
      style={{ width: collapsed ? "3rem" : "14rem" }}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-4 z-10 w-6 h-6 bg-[#B69A5A] rounded-full flex items-center justify-center shadow-md hover:bg-[#c9ae6d] transition-colors"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-black" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-black" />
        )}
      </button>

      {/* Section label */}
      {!collapsed && (
        <div className="px-3 pt-4 pb-2">
          <span className="text-[#B69A5A] text-[0.6rem] font-bold uppercase tracking-[0.15em]">
            Product Catalog
          </span>
        </div>
      )}

      {/* Category list */}
      <nav className="flex-1 overflow-y-auto py-1">
        {categories.map((cat) => {
          const isActive = cat.id === activeCategoryId;
          const itemCount = cat.tabs.reduce((sum, t) => sum + t.items.length, 0);
          const sectionLabel = SECTION_LABELS[cat.id];

          return (
            <div key={cat.id}>
              {/* Section divider label */}
              {sectionLabel && !collapsed && (
                <div className="px-3 pt-3 pb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[0.55rem] font-bold uppercase tracking-[0.15em] text-white/25 whitespace-nowrap">
                      {sectionLabel}
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                </div>
              )}
              {sectionLabel && collapsed && (
                <div className="my-1 mx-2 h-px bg-white/10" />
              )}

              <button
                onClick={() => onCategorySelect(cat.id)}
                className={`ias-sidebar-item w-full text-left flex items-center gap-2.5 px-3 py-2.5 ${isActive ? "active" : ""}`}
                title={collapsed ? cat.name : undefined}
              >
                {/* Gold-filled checkbox — filled when active */}
                <span className={`flex-shrink-0 w-4 h-4 rounded-sm border flex items-center justify-center transition-all duration-150 ${
                  isActive
                    ? "bg-[#B69A5A] border-[#B69A5A]"
                    : "bg-transparent border-white/25"
                }`}>
                  {isActive && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1,4 3.5,6.5 9,1" />
                    </svg>
                  )}
                </span>

                {!collapsed && (
                  <>
                    <span className={`flex-1 text-xs leading-tight ias-sidebar-label ${isActive ? "" : ""}`}>
                      {cat.name}
                    </span>
                    <span className="flex-shrink-0 flex items-center gap-1">
                      {cat.isNetPrice && (
                        <span className="text-[0.55rem] text-[#f4ce47] font-bold uppercase tracking-wide">NET</span>
                      )}
                      <span className="text-[0.6rem] text-white/25">{itemCount}</span>
                    </span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Bottom branding */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-white/10">
          <div className="text-white/20 text-[0.6rem] uppercase tracking-widest">
            2026 Price List
          </div>
        </div>
      )}
    </aside>
  );
}
