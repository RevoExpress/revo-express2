import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
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
