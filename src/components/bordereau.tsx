import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Phone, MapPin, Package, Calendar } from "lucide-react";
import logoLight from "@/assets/logo-light.png";

type Colis = {
  tracking: string;
  client_id?: string | null;
  code_client?: string | null;
  expediteur_nom: string;
  expediteur_tel: string;
  expediteur_adresse: string;
  expediteur_commune?: string | null;
  destinataire_nom: string;
  destinataire_tel: string;
  destinataire_adresse: string;
  destinataire_wilaya?: string | null;
  destinataire_commune?: string | null;
  destinataire_cp?: string | null;
  description?: string | null;
  depart?: string | null;
  prix: number;
  prix_colis?: number | null;
  type_livraison?: string | null;
  type_colis?: string | null;
  produit_retour?: string | null;
  split_article1_nom?: string | null;
  split_article1_prix?: number | null;
  split_article2_nom?: string | null;
  split_article2_prix?: number | null;
  notes?: string | null;
};

function crCode(colis: Colis): string {
  if (colis.code_client) return colis.code_client;
  if (colis.client_id) return colis.client_id.replace(/-/g, "").slice(-6).toUpperCase();
  return "------";
}

// Groupe les chiffres façon "0563 45 30 72" pour une lecture rapide par le livreur.
function formatPhone(tel?: string | null): string {
  if (!tel) return "—";
  const d = tel.replace(/\D/g, "");
  if (d.length === 10) return d.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
  if (d.length === 9) return d.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
  return tel;
}

export function Bordereau({ colis }: { colis: Colis }) {
  const dateStr = new Date().toLocaleDateString("fr-FR");
  const totalEncaisser = Number(colis.prix_colis ?? 0) + Number(colis.prix ?? 0);
  const isUrgent = colis.type_livraison === "urgent";
  const bandColor = isUrgent ? "#dc2626" : "#f97316";
  const bandLabel = isUrgent ? "URGENT" : "STANDARD";
  const cr = crCode(colis);
  const isRetour = colis.type_colis === "ECH" || colis.type_colis === "SPL";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://revo-express.com";

  return (
    <div
      className="bordereau-sheet"
      dir="ltr"
      style={{
        fontFamily: "Arial, sans-serif",
        color: "#000",
        background: "#fff",
        width: "105mm",
        height: "148.5mm",
        border: "1px solid #d4d4d4",
        borderRadius: 4,
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Bande STANDARD / URGENT */}
      <div style={{
        background: bandColor, color: "#fff", padding: "4px 8px",
        fontWeight: 900, fontSize: "12px", letterSpacing: "0.25em",
        textAlign: "center", flexShrink: 0,
      }}>
        {bandLabel}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "3mm", gap: "2.5mm", minHeight: 0 }}>
        {/* Logo + QR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <img src={logoLight} alt="REVO EXPRESS" style={{ height: "72px", width: "auto", display: "block" }} />
            <div style={{ fontSize: "8.5px", lineHeight: 1.3, color: "#333", marginTop: 2 }}>
              <div style={{ fontWeight: 700 }}>SARL Revo Express</div>
              <div>07 93 46 18 77</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <QRCodeSVG value={`${origin}/track/${colis.tracking}`} size={54} level="M" includeMargin={false} />
            <div style={{ fontSize: "7px", fontWeight: 700, letterSpacing: "0.1em", color: "#555", marginTop: 1 }}>SCAN</div>
          </div>
        </div>

        {/* Badge retour */}
        {isRetour && (
          <div style={{ background: "#000", color: "#fff", padding: "2px 6px", borderRadius: 3, textAlign: "center", fontSize: "10px", fontWeight: 900, letterSpacing: "0.15em" }}>
            {colis.type_colis === "ECH" ? "ÉCHANGE" : "SPLIT"}
          </div>
        )}
        {colis.type_colis === "ECH" && (
          <div style={{ border: "1px solid #000", background: "#f5f5f5", borderRadius: 3, padding: "3px 5px" }}>
            <div style={{ fontSize: "7.5px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>
              Produit à récupérer
            </div>
            <div style={{ fontSize: "10.5px", fontWeight: 700 }}>{colis.produit_retour || "(non précisé)"}</div>
          </div>
        )}
        {colis.type_colis === "SPL" && (colis.split_article1_prix != null || colis.split_article2_prix != null) && (
          <div style={{ border: "1px solid #000", background: "#f5f5f5", borderRadius: 3, padding: "3px 5px" }}>
            <div style={{ fontSize: "7.5px", fontWeight: 700, textTransform: "uppercase", color: "#555", marginBottom: 1 }}>
              2 articles — encaisser selon ce qui est accepté
            </div>
            {colis.split_article1_prix != null && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", fontWeight: 700 }}>
                <span>{colis.split_article1_nom || "Article 1"}</span>
                <span>{Number(colis.split_article1_prix).toLocaleString("fr-FR")} DA</span>
              </div>
            )}
            {colis.split_article2_prix != null && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", fontWeight: 700 }}>
                <span>{colis.split_article2_nom || "Article 2"}</span>
                <span>{Number(colis.split_article2_prix).toLocaleString("fr-FR")} DA</span>
              </div>
            )}
          </div>
        )}

        {/* Expéditeur + Destinataire côte à côte — le destinataire est mis en évidence : c'est l'info clé pour le livreur */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: "2mm" }}>
          <div style={{ border: "1px solid #d4d4d4", borderRadius: 3, padding: "4px 5px", minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: "7.5px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>Expéditeur</div>
              <div style={{ fontSize: "7px", fontWeight: 800, fontFamily: "monospace" }}>CR:{cr}</div>
            </div>
            <div style={{ fontSize: "10.5px", fontWeight: 700, marginTop: 1, wordBreak: "break-word", lineHeight: 1.15 }}>{colis.expediteur_nom}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "9px", color: "#333", marginTop: 2 }}>
              <Phone style={{ width: 9, height: 9, flexShrink: 0 }} strokeWidth={2.5} />
              <span>{formatPhone(colis.expediteur_tel)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 2, fontSize: "8.5px", color: "#555", marginTop: 2, lineHeight: 1.25 }}>
              <MapPin style={{ width: 8.5, height: 8.5, flexShrink: 0, marginTop: 1 }} strokeWidth={2.5} />
              <span>Ramassage : {colis.expediteur_commune || colis.depart || "—"}</span>
            </div>
          </div>

          <div style={{ border: "1.5px solid #f97316", background: "#fff6ee", borderRadius: 3, padding: "5px 6px", minWidth: 0 }}>
            <div style={{ fontSize: "8px", fontWeight: 800, textTransform: "uppercase", color: "#c2410c", letterSpacing: "0.05em" }}>Destinataire</div>
            <div style={{ fontSize: "13px", fontWeight: 900, marginTop: 1.5, wordBreak: "break-word", lineHeight: 1.15 }}>{colis.destinataire_nom}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "11px", fontWeight: 700, color: "#000", marginTop: 2.5 }}>
              <Phone style={{ width: 10, height: 10, flexShrink: 0, color: "#c2410c" }} strokeWidth={2.5} />
              <span>{formatPhone(colis.destinataire_tel)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 2, fontSize: "9px", color: "#333", marginTop: 2.5, lineHeight: 1.25 }}>
              <MapPin style={{ width: 9, height: 9, flexShrink: 0, marginTop: 1, color: "#c2410c" }} strokeWidth={2.5} />
              <span>
                {colis.destinataire_adresse}
                {(colis.destinataire_commune || colis.destinataire_wilaya) && (
                  <><br /><strong>{[colis.destinataire_commune, colis.destinataire_wilaya].filter(Boolean).join(", ")}</strong></>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Code-barres — hauteur suffisante pour une douchette optique */}
        <div style={{ textAlign: "center" }}>
          <Barcode value={colis.tracking} height={48} fontSize={0} displayValue={false} margin={0} width={1.7} />
          <div style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", marginTop: 2 }}>{colis.tracking}</div>
        </div>

        {/* Montant */}
        <div style={{ border: "1.5px solid #000", borderRadius: 6, padding: "5px 8px", textAlign: "center" }}>
          <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>Montant à encaisser</div>
          <div style={{ fontSize: "23px", fontWeight: 900, lineHeight: 1, marginTop: 2 }}>{totalEncaisser.toLocaleString("fr-FR")} DA</div>
          <div style={{ fontSize: "8px", fontWeight: 700, color: "#666", marginTop: 3, borderTop: "1px dashed #ddd", paddingTop: 2 }}>
            Espèces à la livraison
          </div>
        </div>

        {/* Contenu + Départ */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "2mm" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Package style={{ width: 9, height: 9, flexShrink: 0, color: "#555", marginTop: 1 }} strokeWidth={2} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "7.5px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>Contenu</div>
              <div style={{ fontSize: "10.5px", fontWeight: 800, lineHeight: 1.25, wordBreak: "break-word" }}>{colis.description || "Colis"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <MapPin style={{ width: 9, height: 9, flexShrink: 0, color: "#555", marginTop: 1 }} strokeWidth={2} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "7.5px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>Bureau départ</div>
              <div style={{ fontSize: "9.5px" }}>{colis.depart || "—"}</div>
            </div>
          </div>
        </div>

        {/* Certification légale */}
        <div style={{ fontSize: "7.5px", fontWeight: 700, lineHeight: 1.35, color: "#333", textAlign: "center" }}>
          {colis.expediteur_nom} certifie l'exactitude des informations ci-dessus et l'absence de tout produit dangereux, illicite ou interdit au transport. En signant, il/elle accepte les Conditions Générales de Transport SARL Revo Express (revo-express.com/cgv).
        </div>

        {/* Date + Signature */}
        <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: "2px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "9px" }}>
            <Calendar style={{ width: 9, height: 9, color: "#555" }} strokeWidth={2} />
            <span>{dateStr}</span>
          </div>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "#555" }}>SIGNATURE</div>
        </div>
      </div>
    </div>
  );
}

// Format compact 100×100mm (petites étiquettes thermiques). Le format standard (105×148.5mm)
// ne peut pas juste être réduit à l'échelle — le texte deviendrait illisible sur une imprimante
// thermique basse résolution. On garde ici uniquement l'essentiel : destinataire, code-barres,
// montant. L'expéditeur et le pied de page détaillé (contenu/départ/mentions légales) sont
// sacrifiés faute de place ; ils restent disponibles via les formats A4/A6.
export function Bordereau10x10({ colis }: { colis: Colis }) {
  const totalEncaisser = Number(colis.prix_colis ?? 0) + Number(colis.prix ?? 0);
  const isUrgent = colis.type_livraison === "urgent";
  const bandColor = isUrgent ? "#dc2626" : "#f97316";
  const bandLabel = isUrgent ? "URGENT" : "STANDARD";
  const isRetour = colis.type_colis === "ECH" || colis.type_colis === "SPL";

  return (
    <div
      className="bordereau-sheet"
      dir="ltr"
      style={{
        fontFamily: "Arial, sans-serif",
        color: "#000",
        background: "#fff",
        width: "100mm",
        height: "100mm",
        border: "1px solid #d4d4d4",
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div style={{
        background: bandColor, color: "#fff", padding: "2px 6px",
        fontWeight: 900, fontSize: "9px", letterSpacing: "0.2em",
        textAlign: "center", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{bandLabel}</span>
        {isRetour && <span>{colis.type_colis === "ECH" ? "ÉCHANGE" : "SPLIT"}</span>}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "2.5mm", gap: "1.8mm", minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <img src={logoLight} alt="REVO EXPRESS" style={{ height: "26px", width: "auto", display: "block" }} />
          <div style={{ fontSize: "7px", fontWeight: 700, color: "#555", textAlign: "right" }}>
            <div>{colis.expediteur_nom}</div>
            <div>{formatPhone(colis.expediteur_tel)}</div>
          </div>
        </div>

        <div style={{ border: "1.5px solid #f97316", background: "#fff6ee", borderRadius: 3, padding: "4px 5px", minWidth: 0 }}>
          <div style={{ fontSize: "7px", fontWeight: 800, textTransform: "uppercase", color: "#c2410c" }}>Destinataire</div>
          <div style={{ fontSize: "11px", fontWeight: 900, marginTop: 1, wordBreak: "break-word", lineHeight: 1.15 }}>{colis.destinataire_nom}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "9.5px", fontWeight: 700, marginTop: 2 }}>
            <Phone style={{ width: 9, height: 9, flexShrink: 0, color: "#c2410c" }} strokeWidth={2.5} />
            <span>{formatPhone(colis.destinataire_tel)}</span>
          </div>
          <div style={{ fontSize: "8px", color: "#333", marginTop: 2, lineHeight: 1.2, wordBreak: "break-word" }}>
            {colis.destinataire_adresse}
            {(colis.destinataire_commune || colis.destinataire_wilaya) && (
              <> — <strong>{[colis.destinataire_commune, colis.destinataire_wilaya].filter(Boolean).join(", ")}</strong></>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <Barcode value={colis.tracking} height={32} fontSize={0} displayValue={false} margin={0} width={1.3} />
          <div style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", marginTop: 1 }}>{colis.tracking}</div>
        </div>

        <div style={{ border: "1.5px solid #000", borderRadius: 5, padding: "3px 6px", textAlign: "center" }}>
          <div style={{ fontSize: "6.5px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>Montant à encaisser</div>
          <div style={{ fontSize: "17px", fontWeight: 900, lineHeight: 1.1 }}>{totalEncaisser.toLocaleString("fr-FR")} DA</div>
        </div>
      </div>
    </div>
  );
}
