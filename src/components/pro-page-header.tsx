import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ProPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Optional KPI row rendered below (use grid of cards) */
  kpis?: ReactNode;
}

/**
 * Unified header for all pro spaces (admin, commercial, opérations, livreur…).
 * Glass card with brand-orange icon badge, title, subtitle and right action slot.
 */
export function ProPageHeader({ icon: Icon, title, subtitle, action, kpis }: ProPageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/80 p-6 shadow-card backdrop-blur-sm sm:p-7">
        {/* Decorative orange glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-glow">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
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
