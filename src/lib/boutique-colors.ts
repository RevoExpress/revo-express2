// Ancien système : une couleur arc-en-ciel par boutique (16 teintes, calculée depuis l'id).
// Retiré — la charte "surcharge de couleurs" demande des badges secondaires en tons neutres ;
// le nom de la boutique reste le texte, donc l'info n'est pas perdue, juste plus discrète.
export function boutiqueColorClass(_id?: string | null): string {
  return "bg-muted text-foreground border border-border";
}
