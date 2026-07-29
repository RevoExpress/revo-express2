// Source unique pour les board "tous les colis" (admin.tsx, operations.tsx, service-client.tsx).
// Ces trois écrans affichaient auparavant des copies indépendantes de ces mêmes constantes,
// avec le risque qu'elles divergent silencieusement à chaque modification.

// 3 niveaux seulement : vert = normal, orange = à surveiller, rouge = problème acté.
// (voir aussi STATUT_HEX/STATUT_PILL dans colis-status-menu.tsx et STATUTS[].color dans tarifs.ts —
// les trois doivent rester d'accord sur le même classement par statut.)
export const STATUT_GROUP_BG: Record<string, string> = {
  "en-preparation": "bg-warning/10", "ramasse": "bg-success/10", "expedie": "bg-success/10",
  "en-livraison": "bg-success/10", "contact-client": "bg-warning/10",
  "client-injoignable-1": "bg-warning/10", "client-injoignable-2": "bg-warning/10", "client-injoignable-3": "bg-warning/10",
  "livre": "bg-success/10", "reporte": "bg-warning/10", "echec-livraison": "bg-destructive/10",
  "retourne-vendeur": "bg-destructive/10", "annule": "bg-destructive/10",
};

export const STATUT_GROUP_TEXT: Record<string, string> = {
  "en-preparation": "text-warning", "ramasse": "text-success", "expedie": "text-success",
  "en-livraison": "text-success", "contact-client": "text-warning",
  "client-injoignable-1": "text-warning", "client-injoignable-2": "text-warning", "client-injoignable-3": "text-warning",
  "livre": "text-success", "reporte": "text-warning", "echec-livraison": "text-destructive",
  "retourne-vendeur": "text-destructive", "annule": "text-destructive",
};

export function initiales(nom: string) {
  return nom.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}
