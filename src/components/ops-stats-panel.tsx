import { useEffect, useState } from "react";
import { Trophy, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function isToday(iso: string) {
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
function isYesterday(iso: string) {
  const d = new Date(iso), y = new Date();
  y.setDate(y.getDate() - 1);
  return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate();
}

export function OpsStatsPanel({ colis, livreurs }: { colis: any[]; livreurs: any[] }) {
  const [historique, setHistorique] = useState<any[]>([]);

  useEffect(() => {
    const deuxJours = new Date();
    deuxJours.setDate(deuxJours.getDate() - 2);
    supabase.from("colis_historique")
      .select("colis_id, statut, created_at")
      .gte("created_at", deuxJours.toISOString())
      .then(({ data }) => setHistorique(data || []));
  }, [colis.length]);

  const colisById = new Map(colis.map((c) => [c.id, c]));

  // Livraisons du jour par livreur (vraies données, depuis l'historique de statut)
  const livraisonsAuj: Record<string, number> = {};
  let livresAuj = 0, livresHier = 0;
  historique.forEach((h) => {
    if (h.statut !== "livre") return;
    if (isToday(h.created_at)) {
      livresAuj++;
      const c = colisById.get(h.colis_id);
      const lid = c?.livreur_id;
      if (lid) livraisonsAuj[lid] = (livraisonsAuj[lid] ?? 0) + 1;
    } else if (isYesterday(h.created_at)) {
      livresHier++;
    }
  });

  const classement = Object.entries(livraisonsAuj)
    .map(([lid, n]) => ({ nom: livreurs.find((l) => l.id === lid)?.nom || livreurs.find((l) => l.id === lid)?.email || "—", n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  const creesAuj = colis.filter((c) => isToday(c.date_creation)).length;
  const creesHier = colis.filter((c) => isYesterday(c.date_creation)).length;
  const echecsAuj = historique.filter((h) => h.statut === "echec-livraison" && isToday(h.created_at)).length;
  const echecsHier = historique.filter((h) => h.statut === "echec-livraison" && isYesterday(h.created_at)).length;

  const Trend = ({ delta }: { delta: number }) =>
    delta === 0 ? <span className="text-muted-foreground">= hier</span> :
    delta > 0 ? <span className="flex items-center gap-0.5 text-success"><ArrowUp className="h-3 w-3" />+{delta} vs hier</span> :
    <span className="flex items-center gap-0.5 text-destructive"><ArrowDown className="h-3 w-3" />{delta} vs hier</span>;

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-secondary/50 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Trophy className="h-3.5 w-3.5" /> Livreurs du jour
        </div>
        {classement.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune livraison enregistrée aujourd'hui.</p>
        ) : (
          <div className="space-y-1.5">
            {classement.map((l, i) => (
              <div key={l.nom + i} className="flex items-center justify-between text-sm">
                <span><span className={i === 0 ? "font-bold text-warning" : "text-muted-foreground"}>{i + 1}.</span> {l.nom}</span>
                <span className="font-semibold">{l.n} livré{l.n > 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-secondary/50 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> Aujourd'hui vs hier
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between"><span>Colis créés</span><span className="font-semibold">{creesAuj} <Trend delta={creesAuj - creesHier} /></span></div>
          <div className="flex items-center justify-between"><span>Livrés</span><span className="font-semibold">{livresAuj} <Trend delta={livresAuj - livresHier} /></span></div>
          <div className="flex items-center justify-between"><span>Échecs</span><span className="font-semibold">{echecsAuj} <Trend delta={echecsAuj - echecsHier} /></span></div>
        </div>
      </div>
    </div>
  );
}