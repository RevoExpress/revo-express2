// Petite carte KPI compacte, réutilisée par ColisBoard (admin/opérations/service-client) et Mes Colis.
// Cliquable en option : sert de filtre rapide sur la liste juste en dessous (ex. cliquer "Livrés"
// n'affiche que les colis livrés). `active` met en évidence le filtre actuellement appliqué.
export function KpiChip({
  icon: Icon, label, value, tone, onClick, active,
}: {
  icon: any; label: string; value: number; tone: "primary" | "success" | "warning" | "destructive";
  onClick?: () => void; active?: boolean;
}) {
  const tones: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card ${
        onClick ? "cursor-pointer text-left" : ""
      } ${active ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-lg font-black leading-tight">{value}</div>
      </div>
    </Tag>
  );
}
