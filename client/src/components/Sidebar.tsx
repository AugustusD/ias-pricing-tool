/**
 * IAS Sidebar Component
 * Black sidebar with gold active indicator, category navigation
 */

import {
  Grid3X3, Square, Columns2, Minus, DoorOpen, Infinity, Wrench, Palette, BookOpen, ChevronLeft, ChevronRight
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

          return (
            <button
              key={cat.id}
              onClick={() => onCategorySelect(cat.id)}
              className={`ias-sidebar-item w-full text-left flex items-center gap-2.5 px-3 py-2.5 ${isActive ? "active" : ""}`}
              title={collapsed ? cat.name : undefined}
            >
              <span className={`flex-shrink-0 ${isActive ? "text-[#B69A5A]" : "text-white/40"}`}>
                {ICON_MAP[cat.icon] ?? <Square className="w-4 h-4" />}
              </span>

              {!collapsed && (
                <>
                  <span className={`flex-1 text-xs leading-tight ias-sidebar-label ${isActive ? "" : ""}`}>
                    {cat.name}
                  </span>
                  <span className="flex-shrink-0 flex items-center gap-1">
                    {cat.isInfinity && (
                      <span className="text-[0.55rem] text-[#B69A5A] font-bold uppercase tracking-wide">INF</span>
                    )}
                    {cat.isNetPrice && (
                      <span className="text-[0.55rem] text-[#f4ce47] font-bold uppercase tracking-wide">NET</span>
                    )}
                    <span className="text-[0.6rem] text-white/25">{itemCount}</span>
                  </span>
                </>
              )}
            </button>
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
