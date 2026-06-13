import { useI18n } from "@/hooks/use-i18n";
import { Languages } from "lucide-react";

export function LangSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-accent ${className}`}
      aria-label="Change language"
    >
      <Languages className="h-3.5 w-3.5" />
      {lang === "fr" ? "ع" : "FR"}
    </button>
  );
}
