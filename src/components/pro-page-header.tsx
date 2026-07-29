import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ProPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Optional KPI row rendered below (use grid of cards) */
  kpis?: ReactNode;
  /** Compact variant for data-dense working screens (e.g. Finance) — less padding, smaller icon badge. */
  dense?: boolean;
}

/**
 * Unified header for all pro spaces (admin, commercial, opérations, livreur…).
 * Glass card with brand-orange icon badge, title, subtitle and right action slot.
 */
export function ProPageHeader({ icon: Icon, title, subtitle, action, kpis, dense }: ProPageHeaderProps) {
  return (
    <div className={dense ? "mb-5" : "mb-8"}>
      <div className={`relative overflow-hidden rounded-3xl border border-border bg-card/80 shadow-card backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-500 ${dense ? "p-4" : "p-6 sm:p-7"}`}>
        {/* Decorative orange glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-glow ${dense ? "h-9 w-9" : "h-12 w-12"}`}>
              <Icon className={dense ? "h-4 w-4" : "h-6 w-6"} />
            </div>
            <div className="min-w-0">
              <h1 className={`font-black tracking-tight text-foreground ${dense ? "text-lg" : "text-2xl sm:text-3xl"}`}>
                {title}
              </h1>
              {subtitle && (
                <p className={`max-w-2xl text-muted-foreground ${dense ? "text-xs" : "mt-1 text-sm"}`}>{subtitle}</p>
              )}
            </div>
          </div>

          {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
        </div>

        {kpis && <div className="relative mt-6">{kpis}</div>}
      </div>
    </div>
  );
}
