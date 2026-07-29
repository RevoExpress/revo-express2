import { Eye } from "lucide-react";
import { useA11y } from "@/hooks/use-a11y";
import { useI18n } from "@/hooks/use-i18n";
import { NewBadge } from "@/components/new-badge";

export function A11yToggle({
  variant = "default",
}: {
  variant?: "default" | "brand";
}) {
  const { large, toggle } = useA11y();
  const { t } = useI18n();
  const label = large ? t("a11y.toggle.off") : t("a11y.toggle.on");

  if (variant === "brand") {
    return (
      <button
        onClick={toggle}
        aria-pressed={large}
        aria-label={label}
        title={label}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
          large ? "bg-white text-primary" : "text-white/90 hover:bg-white/15 hover:text-white"
        }`}
      >
        <NewBadge id="a11y-toggle" />
        <Eye className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={large}
      aria-label={label}
      title={label}
      className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
        large ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"
      }`}
    >
      <NewBadge id="a11y-toggle" />
      <Eye className="h-3.5 w-3.5" />
      {t("a11y.toggle.short")}
    </button>
  );
}
