import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, PackageSearch, History, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/suivi")({
  validateSearch: (s: Record<string, unknown>) => ({ t: (s.t as string) || "" }),
  head: () => ({
    meta: [
      { title: "Suivi de colis — REVO EXPRESS" },
      { name: "description", content: "Suivez votre colis en temps réel avec votre numéro de suivi REVO EXPRESS." },
    ],
  }),
  component: SuiviPage,
});

// Nettoie n'importe quelle saisie et en extrait un tracking valide.
// Accepte : "REV-ABC123", "rev-abc123", "ABC123", un lien collé entier,
// des espaces, et les retours ECH-/SPL-. Renvoie null si incompréhensible.
function normalizeTracking(input: string): string | null {
  const raw = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return null;
  // Cas 1 : un tracking complet quelque part dans la saisie (même dans une URL)
  const m = raw.match(/(REV|ECH|SPL)-?([A-Z0-9]{4,10})/);
  if (m) return `${m[1]}-${m[2]}`;
  // Cas 2 : juste le code sans préfixe (ex. "ABC123")
  const code = raw.match(/^([A-Z0-9]{4,10})$/);
  if (code) return `REV-${code[1]}`;
  return null;
}

const RECENT_KEY = "revo-recent-trackings";

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(code: string) {
  try {
    const list = [code, ...getRecent().filter((c) => c !== code)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // stockage indisponible : tant pis, pas bloquant
  }
}

function SuiviPage() {
  const { t } = Route.useSearch();
  const navigate = useNavigate();
  const [tracking, setTracking] = useState(t || "");
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(getRecent());
  }, []);

  // Redirection auto si ?t= est présent dans l'URL
  useEffect(() => {
    if (t) {
      const clean = normalizeTracking(t);
      if (clean) {
        pushRecent(clean);
        navigate({ to: "/track/$code", params: { code: clean }, replace: true });
      }
    }
  }, [t, navigate]);

  function go(code: string) {
    pushRecent(code);
    navigate({ to: "/track/$code", params: { code } });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = normalizeTracking(tracking);
    if (!clean) {
      setError("Numéro non reconnu. Il ressemble à REV-ABC123 — vérifiez-le sur votre bordereau ou auprès de l'expéditeur.");
      return;
    }
    setError(null);
    go(clean);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="bg-gradient-hero py-16 text-white md:py-24">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <PackageSearch className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-black md:text-5xl">Où est mon colis&nbsp;?</h1>
          <p className="mt-3 text-white/80">
            Entrez votre numéro de suivi pour voir l'avancement en temps réel.
          </p>

          <form onSubmit={onSubmit} className="mt-8">
            <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={tracking}
                  onChange={(e) => { setTracking(e.target.value); if (error) setError(null); }}
                  placeholder="REV-ABC123"
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="h-14 w-full rounded-xl bg-transparent pl-12 pr-4 font-mono text-lg font-bold uppercase tracking-wider text-foreground outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" size="lg" className="h-14 gap-2 rounded-xl bg-gradient-primary px-8 text-base font-bold shadow-glow">
                Suivre <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
            {error && (
              <p className="mt-3 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20">
                {error}
              </p>
            )}
          </form>

          {recent.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">
                <History className="h-3.5 w-3.5" /> Recherches récentes
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {recent.map((code) => (
                  <button
                    key={code}
                    onClick={() => go(code)}
                    className="rounded-full bg-white/10 px-4 py-1.5 font-mono text-sm font-bold ring-1 ring-white/20 transition-colors hover:bg-white/20"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-8 text-xs text-white/60">
            Accès public — aucune connexion requise. Le numéro figure sur votre bordereau ou le message de l'expéditeur.
          </p>
        </div>
      </section>
      <div className="flex-1" />
      <SiteFooter />
    </div>
  );
}