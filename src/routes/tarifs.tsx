import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { TARIFFS } from "@/lib/tarifs";

export const Route = createFileRoute("/tarifs")({
  head: () => ({
    meta: [
      { title: "Tarifs — REVO EXPRESS" },
      { name: "description", content: "Tarifs transparents pour la livraison same-day à Alger. À partir de 300 DA." },
    ],
  }),
  component: TarifsPage,
});

function TarifsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="bg-gradient-hero py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-balance text-5xl font-black md:text-6xl">Tarifs transparents</h1>
          <p className="mt-4 text-white/80">Payez au juste prix selon la distance. Pas de surprise.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full">
              <thead className="bg-navy text-navy-foreground">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Distance</th>
                  <th className="px-6 py-4 text-right text-sm font-bold uppercase tracking-wider">Prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TARIFFS.map((t, i) => (
                  <tr key={i} className="transition-colors hover:bg-accent/50">
                    <td className="px-6 py-4 font-medium">
                      Jusqu'à <span className="text-primary">{t.maxKm} km</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-2xl font-black">{t.price}</span>
                      <span className="ml-1 text-sm text-muted-foreground">DA</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-accent/30">
                  <td className="px-6 py-4 font-medium">Plus de 50 km</td>
                  <td className="px-6 py-4 text-right text-sm text-muted-foreground">+300 DA / 10 km</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {["Prise en charge sous 30 min", "Livraison same-day garantie", "Suivi temps réel inclus"].map((s) => (
              <div key={s} className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
