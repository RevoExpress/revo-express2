import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ShieldCheck, X } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

export function FloatingBanner() {
  const { t } = useI18n();
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-3xl items-center gap-4 rounded-2xl border border-orange-200/60 bg-white/85 px-4 py-3 text-foreground shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-orange-400/30 dark:bg-[#1c120d]/80 dark:text-white dark:ring-white/10 sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-inner">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight text-foreground dark:text-white">{t("fb.title")}</p>
          <p className="truncate text-xs text-foreground/60 dark:text-orange-200/80">{t("fb.sub")}</p>
        </div>
        <Link
          to="/commander"
          className="hidden shrink-0 items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-white shadow-md transition-transform hover:scale-105 dark:bg-white dark:bg-none dark:text-orange-600 sm:inline-flex"
        >
          {t("fb.cta")} <ArrowRight className="h-4 w-4" />
        </Link>
        <button
          onClick={() => setClosed(true)}
          aria-label="Fermer"
          className="shrink-0 rounded-md p-1 text-foreground/50 hover:bg-black/5 hover:text-foreground dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
