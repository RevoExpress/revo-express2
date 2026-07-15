import * as XLSX from "xlsx";

// Colonnes du modèle d'import (ordre et intitulés)
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

// Génère et télécharge un modèle Excel vierge (avec 1 ligne d'exemple)
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

// Parse un fichier Excel uploadé → tableau de lignes normalisées
export async function parserFichierImport(file: File): Promise<any[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

  // Remappe les intitulés FR vers les clés techniques
  const reverse: Record<string, string> = {};
  for (const key of COLUMNS) reverse[HEADERS_FR[key]] = key;

  return rows.map((r) => {
    const out: Record<string, any> = {};
    for (const [frLabel, val] of Object.entries(r)) {
      const key = reverse[frLabel] ?? frLabel;
      out[key] = val;
    }
    return out;
  });
}
