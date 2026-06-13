import * as XLSX from "xlsx";
import { STATUTS } from "@/lib/tarifs";

type ColisRow = Record<string, any>;

const statutLabel = (k: string) => STATUTS.find((s) => s.key === k)?.label ?? k;

const fmtDate = (v: unknown) => {
  if (!v) return "";
  try {
    return new Date(String(v)).toLocaleString("fr-FR");
  } catch {
    return String(v);
  }
};

type ExportOpts = {
  livreurById?: Map<string, { nom?: string | null; telephone?: string | null }>;
};

export function exportColisToXLSX(
  rows: ColisRow[],
  filename = "colis.xlsx",
  opts: ExportOpts = {},
) {
  const { livreurById } = opts;

  const headers = [
    "Tracking",
    "Statut",
    "Type",
    "Date création",
    "Expéditeur",
    "Tél expéditeur",
    "Départ",
    "Destinataire",
    "Tél destinataire",
    "Adresse destinataire",
    "Wilaya",
    "Code postal",
    "Description",
    "Distance (km)",
    "Prix colis (DA)",
    "Frais livraison (DA)",
    "Total à encaisser (DA)",
    "Livreur",
    "Tél livreur",
  ];

  const data = rows.map((c) => {
    const l = c.livreur_id && livreurById ? livreurById.get(c.livreur_id) : null;
    return [
      c.tracking,
      statutLabel(c.statut),
      c.type_livraison === "urgent" ? "Urgent" : "Standard",
      fmtDate(c.date_creation),
      c.expediteur_nom ?? "",
      c.expediteur_tel ?? "",
      c.depart ?? "",
      c.destinataire_nom ?? "",
      c.destinataire_tel ?? "",
      c.destinataire_adresse ?? "",
      c.destinataire_wilaya ?? "",
      c.destinataire_cp ?? "",
      c.description ?? "",
      Number(c.distance_km ?? 0),
      Number(c.prix_colis ?? 0),
      Number(c.prix ?? 0),
      Number(c.prix_colis ?? 0) + Number(c.prix ?? 0),
      l?.nom ?? "",
      l?.telephone ?? "",
    ];
  });

  // Totals row
  const totalColis = data.reduce((s, r) => s + Number(r[14] || 0), 0);
  const totalFrais = data.reduce((s, r) => s + Number(r[15] || 0), 0);
  const totalGlobal = totalColis + totalFrais;
  const totalsRow = [
    "TOTAL", "", "", "", "", "", "", "", "", "", "", "", "",
    "", totalColis, totalFrais, totalGlobal, "", "",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data, [], totalsRow]);
  ws["!cols"] = [
    { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 20 },
    { wch: 22 }, { wch: 16 }, { wch: 16 },
    { wch: 22 }, { wch: 16 }, { wch: 32 },
    { wch: 14 }, { wch: 12 }, { wch: 28 },
    { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 18 },
    { wch: 20 }, { wch: 16 },
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: 1 } as any;

  // Bold header cells
  for (let i = 0; i < headers.length; i++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[ref]) ws[ref].s = { font: { bold: true } };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Colis");

  // === Résumé sheet ===
  const byStatut = new Map<string, { count: number; cod: number; frais: number }>();
  const byWilaya = new Map<string, { count: number; cod: number }>();
  const byLivreur = new Map<string, { count: number; livre: number; cod: number }>();
  for (const c of rows) {
    const s = byStatut.get(c.statut) ?? { count: 0, cod: 0, frais: 0 };
    s.count++;
    s.cod += Number(c.prix_colis ?? 0);
    s.frais += Number(c.prix ?? 0);
    byStatut.set(c.statut, s);

    const w = c.destinataire_wilaya ?? "—";
    const wb2 = byWilaya.get(w) ?? { count: 0, cod: 0 };
    wb2.count++;
    wb2.cod += Number(c.prix_colis ?? 0);
    byWilaya.set(w, wb2);

    if (c.livreur_id) {
      const lname = livreurById?.get(c.livreur_id)?.nom ?? c.livreur_id.slice(0, 8);
      const lb = byLivreur.get(lname) ?? { count: 0, livre: 0, cod: 0 };
      lb.count++;
      if (c.statut === "livre") {
        lb.livre++;
        lb.cod += Number(c.prix_colis ?? 0);
      }
      byLivreur.set(lname, lb);
    }
  }

  const summary: any[][] = [];
  summary.push(["RÉSUMÉ DE L'EXPORT"]);
  summary.push(["Date export", new Date().toLocaleString("fr-FR")]);
  summary.push(["Nombre de colis", rows.length]);
  summary.push([]);
  summary.push(["Par statut", "Colis", "COD (DA)", "Frais (DA)"]);
  for (const [k, v] of byStatut)
    summary.push([statutLabel(k), v.count, v.cod, v.frais]);
  summary.push([]);
  summary.push(["Par wilaya", "Colis", "COD (DA)"]);
  for (const [k, v] of [...byWilaya].sort((a, b) => b[1].count - a[1].count))
    summary.push([k, v.count, v.cod]);
  summary.push([]);
  summary.push(["Par livreur", "Assignés", "Livrés", "COD encaissé (DA)"]);
  for (const [k, v] of [...byLivreur].sort((a, b) => b[1].count - a[1].count))
    summary.push([k, v.count, v.livre, v.cod]);

  const ws2 = XLSX.utils.aoa_to_sheet(summary);
  ws2["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Résumé");

  XLSX.writeFile(wb, filename);
}

// Backward-compat alias
export const exportColisToCSV = exportColisToXLSX;
