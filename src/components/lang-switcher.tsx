import { useI18n } from "@/hooks/use-i18n";
import { Languages } from "lucide-react";

export function LangSwitcher({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "brand";
}) {
  const { lang, setLang } = useI18n();
  const styles =
    variant === "brand"
      ? "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold uppercase tracking-wider text-white/90 transition-colors hover:bg-white/15 hover:text-white"
      : "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-accent";
  return (
    <button
      onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
      className={`${styles} ${className}`}
      aria-label="Change language"
    >
      <Languages className="h-3.5 w-3.5" />
      {lang === "fr" ? "ع" : "FR"}
    </button>
  );
}