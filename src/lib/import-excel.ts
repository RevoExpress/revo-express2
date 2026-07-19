import * as XLSX from "xlsx";

// Modèle Revo téléchargeable — colonnes simples
const COLUMNS = [
  "destinataire_nom",
  "destinataire_tel",
  "destinataire_adresse",
  "destinataire_wilaya",
  "prix_colis",
  "description",
];

const HEADERS_FR: Record<string, string> = {
  destinataire_nom: "Nom du destinataire",
  destinataire_tel: "Téléphone",
  destinataire_adresse: "Adresse complète",
  destinataire_wilaya: "Wilaya",
  prix_colis: "Montant à encaisser (DA)",
  description: "Description (optionnel)",
};

export function telechargerModeleImport() {
  const exemple = {
    "Nom du destinataire": "Ahmed Benali",
    "Téléphone": "0555123456",
    "Adresse complète": "Cité 200 logements, Bt A, Alger Centre",
    "Wilaya": "Alger",
    "Montant à encaisser (DA)": 3500,
    "Description (optionnel)": "Vêtements",
  };
  const ws = XLSX.utils.json_to_sheet([exemple], {
    header: COLUMNS.map((c) => HEADERS_FR[c]),
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Colis");
  XLSX.writeFile(wb, "modele-import-revo.xlsx");
}

// Normalise un intitulé de colonne (accents, majuscules, espaces, ponctuation)
// pour le comparer sans se soucier de la mise en forme exacte.
function normalizeHeader(s: string): string {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Alias reconnus par champ interne — couvre le modèle Revo ET les exports
// usuels des outils CRM / e-commerce des commerçants. Toute colonne du
// fichier qui ne correspond à aucun alias est simplement ignorée.
const FIELD_ALIASES: Record<string, string[]> = {
  destinataire_nom: [
    "nom du destinataire", "nom destinataire", "nom", "destinataire",
    "customer name", "client", "full name", "fullname",
  ],
  destinataire_tel: [
    "telephone", "tel", "telephone destinataire",
    "customer phone", "phone", "numero", "num tel",
  ],
  destinataire_adresse: [
    "adresse complete", "adresse", "customer address", "address",
  ],
  // Deux niveaux : "commune" est plus précis que "ville/wilaya",
  // on privilégiera le plus précis s'ils sont tous les deux présents.
  _ville_brute: ["wilaya", "city", "ville"],
  _commune_brute: ["commune"],
  prix_colis: [
    "montant a encaisser da", "montant a encaisser", "montant",
    "prix", "price", "cod",
  ],
  description: [
    "description optionnel", "description", "produit", "designation",
    "product name",
  ],
};
const VARIANT_ALIASES = ["variant", "variante"];

// Table [alias normalisé] -> champ interne, construite une seule fois
const ALIAS_LOOKUP: Record<string, string> = {};
for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
  for (const alias of aliases) ALIAS_LOOKUP[normalizeHeader(alias)] = field;
}
const VARIANT_KEYS = VARIANT_ALIASES.map(normalizeHeader);

// Parse un fichier Excel uploadé → tableau de lignes normalisées.
// Reconnaît automatiquement le modèle Revo ET les exports des outils
// de gestion de commandes des commerçants (colonnes en trop ignorées).
export async function parserFichierImport(file: File): Promise<any[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

  return rows.map((r) => {
    const out: Record<string, any> = {};
    let variant = "";
    for (const [header, val] of Object.entries(r)) {
      const norm = normalizeHeader(String(header));
      const field = ALIAS_LOOKUP[norm];
      if (field) {
        if (out[field] === undefined || out[field] === "") out[field] = val;
      } else if (VARIANT_KEYS.includes(norm)) {
        variant = String(val ?? "").trim();
      }
    }
    // La commune (précise) prime sur la ville/wilaya (générique)
    out.destinataire_wilaya = out._commune_brute || out._ville_brute || "";
    delete out._ville_brute;
    delete out._commune_brute;
    if (variant) {
      out.description = [out.description, variant].filter(Boolean).join(" - ");
    }
    return out;
  });
}