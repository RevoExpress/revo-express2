import { useState } from "react";
import { ChevronDown, LayoutDashboard } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

const STORAGE_KEY = "revo:dashboard-stats-collapsed";

/**
 * Wraps the stats/charts block on admin.tsx and operations.tsx — replaced last turn's complaint
 * that the dashboard "prend trop de place" by making it a toggle instead of always-on, remembered
 * across visits (localStorage) since both pages share the same preference.
 */
export function CollapsibleStats({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "1";
  });

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="mb-4">
      <button
        onClick={toggle}
        className="mb-2 flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted/40"
      >
        <span className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-primary" />
          {t("adm.stats.toggle")}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`} />
      </button>
      {!collapsed && children}
    </div>
  );
}
