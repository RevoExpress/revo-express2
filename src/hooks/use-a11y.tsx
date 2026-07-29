import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "revo_a11y_large";

type Ctx = { large: boolean; toggle: () => void };
const A11yContext = createContext<Ctx | undefined>(undefined);

// Mode "grands caractères + contraste élevé" — pensé pour les utilisateurs malvoyants.
// Même schéma que ThemeProvider : classe sur <html>, préférence persistée en localStorage.
export function A11yProvider({ children }: { children: ReactNode }) {
  const [large, setLarge] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setLarge(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("a11y-large", large);
  }, [large]);

  const toggle = () => {
    setLarge((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return <A11yContext.Provider value={{ large, toggle }}>{children}</A11yContext.Provider>;
}

export function useA11y() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error("useA11y must be used inside A11yProvider");
  return ctx;
}
