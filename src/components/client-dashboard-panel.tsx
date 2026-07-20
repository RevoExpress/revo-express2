function isThisMonth(iso: string) {
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}
function isThisWeek(iso: string) {
  const d = new Date(iso), n = new Date();
  const start = new Date(n); start.setDate(n.getDate() - n.getDay());
  start.setHours(0, 0, 0, 0);
  return d >= start;
}
function isToday(iso: string) {
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

// Mini-courbe SVG (sans librairie) — points = nombre de colis créés par jour, 14 derniers jours
function Sparkline({ points }: { points: number[] }) {
  const w = 240, h = 60, pad = 4;
  const max = Math.max(1, ...points);
  const stepX = (w - pad * 2) / (points.length - 1 || 1);
  const coords = points.map((v, i) => [pad + i * stepX, h - pad - (v / max) * (h - pad * 2)]);
  const line = coords.map((c) => c.join(",")).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full">
      <polygon points={area} fill="currentColor" opacity={0.12} />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Anneau SVG (donut) 3 segments — sans librairie
function Donut({ segments }: { segments: { value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 42, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="12" opacity={0.08} />
      {segments.map((s, i) => {
        const frac = s.value / total;
        const dash = frac * c;
        const el = (
          <circle
            key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="12"
            strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} strokeLinecap="butt"
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

export function ClientDashboardPanel({ colis }: { colis: any[] }) {
  const aujourdhui = colis.filter((c) => isToday(c.date_creation)).length;
  const semaine = colis.filter((c) => isThisWeek(c.date_creation)).length;
  const mois = colis.filter((c) => isThisMonth(c.date_creation)).length;
  const total = colis.length;

  const codMois = colis
    .filter((c) => c.statut === "livre" && isThisMonth(c.date_creation))
    .reduce((s, c) => s + Number(c.prix_colis ?? 0), 0);

  const livres = colis.filter((c) => c.statut === "livre").length;
  const echecs = colis.filter((c) => c.statut === "echec-livraison" || c.statut === "retourne-vendeur").length;
  const enCours = total - livres - echecs;

  // 14 derniers jours, nombre de colis créés par jour
  const jours: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const jour = new Date();
    jour.setDate(jour.getDate() - i);
    const n = colis.filter((c) => {
      const d = new Date(c.date_creation);
      return d.getFullYear() === jour.getFullYear() && d.getMonth() === jour.getMonth() && d.getDate() === jour.getDate();
    }).length;
    jours.push(n);
  }

  // Top destinations
  const parCommune: Record<string, number> = {};
  colis.forEach((c) => {
    const k = c.destinataire_wilaya || "—";
    parCommune[k] = (parCommune[k] ?? 0) + 1;
  });
  const topDestinations = Object.entries(parCommune)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const maxDest = topDestinations[0]?.[1] ?? 1;

  return (
    <div className="mb-6 grid gap-3 lg:grid-cols-2">
      {/* COD + courbe */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">COD encaissé ce mois</div>
        <div className="mt-1 text-3xl font-black">{codMois.toLocaleString("fr-FR")} <span className="text-base font-medium text-muted-foreground">DA</span></div>
        <div className="mt-3 h-16 text-primary"><Sparkline points={jours} /></div>
        <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
          <div><div className="text-lg font-black">{aujourdhui}</div><div className="text-[10px] uppercase text-muted-foreground">Aujourd'hui</div></div>
          <div><div className="text-lg font-black">{semaine}</div><div className="text-[10px] uppercase text-muted-foreground">Semaine</div></div>
          <div><div className="text-lg font-black">{mois}</div><div className="text-[10px] uppercase text-muted-foreground">Mois</div></div>
          <div><div className="text-lg font-black">{total}</div><div className="text-[10px] uppercase text-muted-foreground">Total</div></div>
        </div>
      </div>

      {/* Répartition + destinations */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Répartition</div>
          <div className="mx-auto h-24 w-24">
            <Donut segments={[
              { value: livres, color: "#22c55e" },
              { value: enCours, color: "#378ADD" },
              { value: echecs, color: "#dc2626" },
            ]} />
          </div>
          <div className="mt-2 space-y-1 text-[11px]">
            <div className="flex items-center justify-between"><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-success" />Livrés</span><span>{total ? Math.round((livres / total) * 100) : 0}%</span></div>
            <div className="flex items-center justify-between"><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-info" />En cours</span><span>{total ? Math.round((enCours / total) * 100) : 0}%</span></div>
            <div className="flex items-center justify-between"><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-destructive" />Échecs</span><span>{total ? Math.round((echecs / total) * 100) : 0}%</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Destinations fréquentes</div>
          <div className="space-y-2.5">
            {topDestinations.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune donnée.</p>
            ) : topDestinations.map(([nom, n]) => (
              <div key={nom}>
                <div className="mb-0.5 flex justify-between text-[11px]"><span className="truncate">{nom}</span><span className="text-muted-foreground">{n}</span></div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(n / maxDest) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}