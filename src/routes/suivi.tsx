import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search, PackageSearch, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { STATUTS } from "@/lib/tarifs";
import { getPublicTracking } from "@/lib/tracking.functions";
import { cn } from "@/lib/utils";

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

function normalizeTracking(input: string): string | null {
  const raw = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return null;
  const m = raw.match(/(REV|ECH|SPL)-?([A-Z0-9]{4,10})/);
  if (m) return `${m[1]}-${m[2]}`;
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
  const lookup = useServerFn(getPublicTracking);
  const [tracking, setTracking] = useState(t || "");
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(getRecent());
  }, []);

  const dernier = recent[0];
  const { data: dernierData } = useQuery({
    queryKey: ["public-track-preview", dernier],
    queryFn: () => lookup({ data: { code: dernier! } }),
    enabled: !!dernier,
  });

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

  const dernierStatut = dernierData && !("notFound" in dernierData)
    ? STATUTS.find((s) => s.key === dernierData.colis.statut)
    : null;

  const colorMap: Record<string, string> = {
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <SiteNav />
      <section className="flex-1 pb-24 pt-16 md:pt-24">
        <div className="container mx-auto max-w-md px-4">
          <div className="rounded-2xl bg-card border border-border p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] md:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <PackageSearch className="h-6 w-6 text-foreground" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">Où est mon colis&nbsp;?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Entrez votre numéro de suivi pour voir l'avancement en temps réel.
            </p>

            <form onSubmit={onSubmit} className="mt-7">
              <div className="flex items-center gap-1.5 rounded-xl border border-border p-1.5">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={tracking}
                    onChange={(e) => { setTracking(e.target.value); if (error) setError(null); }}
                    placeholder="REV-ABC123"
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="h-11 w-full rounded-lg bg-transparent pl-9 pr-3 font-mono text-sm font-semibold uppercase tracking-wide text-foreground outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground"
                  />
                </div>
                <Button type="submit" className="h-11 gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Suivre <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              {error && (
                <p className="mt-3 rounded-lg bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
                  {error}
                </p>
              )}
            </form>

            {dernier && (
              <button
                onClick={() => go(dernier)}
                className="mt-5 flex w-full items-center justify-between rounded-xl bg-muted p-4 text-left transition-colors hover:bg-muted/70"
              >
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dernier suivi</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold">{dernier}</div>
                </div>
                {dernierStatut && (
                  <span className={cn("shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold", colorMap[dernierStatut.color])}>
                    {dernierStatut.label}
                  </span>
                )}
              </button>
            )}

            {recent.length > 1 && (
              <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                {recent.slice(1).map((code) => (
                  <button
                    key={code}
                    onClick={() => go(code)}
                    className="rounded-full bg-muted px-3 py-1 font-mono text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Accès public — aucune connexion requise. Le numéro figure sur votre bordereau ou le message de l'expéditeur.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}