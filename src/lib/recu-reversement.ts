// Génération du reçu de reversement.
// Approche sans dépendance : on ouvre une fenêtre avec le reçu en HTML,
// puis window.print() → le navigateur permet "Enregistrer au format PDF".

type ColisRecu = { tracking: string; destinataire_nom: string | null; prix_colis: number | null };
type ReversementRecu = {
  reference: string | null;
  montant_total: number;
  nb_colis: number;
  created_at: string;
};
type CommercantRecu = { nom_boutique?: string | null; nom?: string | null; telephone?: string | null } | null;

export function genererRecuReversement(
  reversement: ReversementRecu,
  colis: ColisRecu[],
  commercant: CommercantRecu,
) {
  const date = new Date(reversement.created_at).toLocaleDateString("fr-FR");
  const nomBoutique = commercant?.nom_boutique || commercant?.nom || "Commerçant";
  const lignes = colis.map((c, i) => `
    <tr>
      <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
      <td style="border:1px solid #ccc;padding:6px;font-family:monospace;">${c.tracking}</td>
      <td style="border:1px solid #ccc;padding:6px;">${c.destinataire_nom ?? "—"}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">${Number(c.prix_colis ?? 0).toLocaleString("fr-FR")} DA</td>
    </tr>`).join("");

  const html = `
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Reçu ${reversement.reference ?? ""}</title>
<style>
  body{font-family:Arial,sans-serif;color:#000;max-width:700px;margin:20px auto;padding:0 20px;}
  h1{color:#f97316;margin-bottom:0;}
  .sub{color:#666;margin-top:4px;font-size:13px;}
  .box{border:2px solid #000;border-radius:8px;padding:14px;text-align:center;margin:18px 0;}
  .box .amt{font-size:32px;font-weight:900;}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px;}
  th{background:#f3f3f3;border:1px solid #ccc;padding:6px;text-align:left;}
  .foot{margin-top:24px;font-size:11px;color:#555;}
  @media print{ .noprint{display:none;} }
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <h1>REVO EXPRESS</h1>
      <div class="sub">SARL Revo Express · Livraison same-day · Alger</div>
      <div class="sub">07 93 46 18 77 · contact@revo-express.com</div>
    </div>
    <div style="text-align:right;font-size:13px;">
      <div><strong>Reçu de reversement</strong></div>
      <div>Réf : ${reversement.reference ?? "—"}</div>
      <div>Date : ${date}</div>
    </div>
  </div>

  <div style="margin-top:16px;font-size:14px;">
    <strong>Versé à :</strong> ${nomBoutique}${commercant?.telephone ? " · " + commercant.telephone : ""}
  </div>

  <div class="box">
    <div style="font-size:12px;color:#666;text-transform:uppercase;">Montant total reversé</div>
    <div class="amt">${Number(reversement.montant_total).toLocaleString("fr-FR")} DA</div>
    <div style="font-size:12px;color:#666;">${reversement.nb_colis} colis</div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Tracking</th><th>Destinataire</th><th style="text-align:right;">Montant</th></tr></thead>
    <tbody>${lignes}</tbody>
  </table>

  <div class="foot">
    Ce reçu atteste du reversement des montants COD (produit) des colis listés ci-dessus,
    conformément aux conditions de service Revo Express. Les frais de livraison ne sont pas inclus.
  </div>

  <div class="noprint" style="margin-top:20px;text-align:center;">
    <button onclick="window.print()" style="background:#f97316;color:#fff;border:0;padding:10px 20px;border-radius:6px;font-weight:bold;cursor:pointer;">
      Imprimer / Enregistrer en PDF
    </button>
  </div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
