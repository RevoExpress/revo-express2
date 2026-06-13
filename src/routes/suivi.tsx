import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function SuiviPage() {
  const { t } = Route.useSearch();
  const navigate = useNavigate();
  const [tracking, setTracking] = useState(t || "");

  // Auto-redirect if ?t= is present
  useEffect(() => {
    if (t) {
      const clean = t.trim().toUpperCase();
      if (clean) navigate({ to: "/track/$code", params: { code: clean }, replace: true });
    }
  }, [t, navigate]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = tracking.trim().toUpperCase();
    if (!clean) return;
    navigate({ to: "/track/$code", params: { code: clean } });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="bg-gradient-hero py-16 text-white">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <h1 className="text-4xl font-black md:text-5xl">Suivi de colis</h1>
          <p className="mt-2 text-white/80">
            Entrez votre numéro de suivi (REV-XXXXXX) pour voir l'avancement en temps réel.
          </p>
          <form onSubmit={onSubmit} className="mt-6 flex gap-2">
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="REV-XXXXXX"
              className="h-12 bg-white text-foreground"
            />
            <Button type="submit" size="lg" className="gap-2 bg-gradient-primary shadow-glow">
              <Search className="h-4 w-4" /> Rechercher
            </Button>
          </form>
          <p className="mt-4 text-xs text-white/60">
            Accès public — aucune connexion requise.
          </p>
        </div>
      </section>
      <div className="flex-1" />
      <SiteFooter />
    </div>
  );
}
