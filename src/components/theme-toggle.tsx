import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle({
  variant = "default",
}: {
  variant?: "default" | "brand";
}) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  if (variant === "brand") {
    return (
      <button
        onClick={toggle}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 hover:text-white"
        aria-label="Toggle theme"
        title={isDark ? "Mode clair" : "Mode sombre"}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    );
  }
  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-accent"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-3.5 w-3.5 text-primary" /> : <Moon className="h-3.5 w-3.5" />}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}