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
  destinataire_cp?: string | null;
  description?: string | null;
  depart?: string | null;
  prix: number;
  prix_colis?: number | null;
  type_livraison?: string | null;
  type_colis?: string | null;
  produit_retour?: string | null;
  notes?: string | null;
};

function crCode(colis: Colis): string {
  if (colis.code_client) return colis.code_client;
  if (colis.client_id) return colis.client_id.replace(/-/g, "").slice(-6).toUpperCase();
  return "------";
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
      id="bordereau-print"
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "3mm", gap: "2.5mm", minHeight: 0 }}>
        {/* Logo + QR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <img src={logoLight} alt="REVO EXPRESS" style={{ height: "36px", width: "auto", display: "block" }} />
            <div style={{ fontSize: "7px", lineHeight: 1.3, color: "#333", marginTop: 2 }}>
              <div style={{ fontWeight: 700 }}>SARL Revo Express</div>
              <div>07 93 46 18 77</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <QRCodeSVG value={`${origin}/track/${colis.tracking}`} size={54} level="M" includeMargin={false} />
            <div style={{ fontSize: "5.5px", fontWeight: 700, letterSpacing: "0.1em", color: "#555", marginTop: 1 }}>SCAN</div>
          </div>
        </div>

        {/* Badge retour */}
        {isRetour && (
          <div style={{ background: "#000", color: "#fff", padding: "2px 6px", borderRadius: 3, textAlign: "center", fontSize: "9px", fontWeight: 900, letterSpacing: "0.15em" }}>
            {colis.type_colis === "ECH" ? "ÉCHANGE" : "SPLIT"}
          </div>
        )}
        {isRetour && (
          <div style={{ border: "1px solid #000", background: "#f5f5f5", borderRadius: 3, padding: "3px 5px" }}>
            <div style={{ fontSize: "6px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>
              {colis.type_colis === "ECH" ? "Produit à récupérer" : "Produit à renvoyer"}
            </div>
            <div style={{ fontSize: "9px", fontWeight: 700 }}>{colis.produit_retour || "(non précisé)"}</div>
          </div>
        )}

        {/* Expéditeur + Destinataire côte à côte */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2mm" }}>
          <div style={{ border: "1px solid #d4d4d4", borderRadius: 3, padding: "4px 5px", minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: "6px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>Expéditeur</div>
              <div style={{ fontSize: "6px", fontWeight: 800, fontFamily: "monospace" }}>CR:{cr}</div>
            </div>
            <div style={{ fontSize: "9px", fontWeight: 700, marginTop: 1, wordBreak: "break-word", lineHeight: 1.15 }}>{colis.expediteur_nom}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "7.5px", color: "#333", marginTop: 2 }}>
              <Phone style={{ width: 8, height: 8, flexShrink: 0 }} strokeWidth={2.5} />
              <span>{colis.expediteur_tel}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 2, fontSize: "7px", color: "#555", marginTop: 2, lineHeight: 1.25 }}>
              <MapPin style={{ width: 8, height: 8, flexShrink: 0, marginTop: 1 }} strokeWidth={2.5} />
              <span>Ramassage : {colis.expediteur_commune || colis.depart || "—"}</span>
            </div>
          </div>

          <div style={{ border: "1px solid #d4d4d4", borderRadius: 3, padding: "4px 5px", minWidth: 0 }}>
            <div style={{ fontSize: "6px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>Destinataire</div>
            <div style={{ fontSize: "9px", fontWeight: 700, marginTop: 1, wordBreak: "break-word", lineHeight: 1.15 }}>{colis.destinataire_nom}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "7.5px", color: "#333", marginTop: 2 }}>
              <Phone style={{ width: 8, height: 8, flexShrink: 0 }} strokeWidth={2.5} />
              <span>{colis.destinataire_tel}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 2, fontSize: "7px", color: "#555", marginTop: 2, lineHeight: 1.25 }}>
              <MapPin style={{ width: 8, height: 8, flexShrink: 0, marginTop: 1 }} strokeWidth={2.5} />
              <span>{colis.destinataire_adresse}{colis.destinataire_wilaya ? `, ${colis.destinataire_wilaya}` : ""}</span>
            </div>
          </div>
        </div>

        {/* Code-barres */}
        <div style={{ textAlign: "center" }}>
          <Barcode value={colis.tracking} height={40} fontSize={0} displayValue={false} margin={0} width={1.6} />
          <div style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", marginTop: 2 }}>{colis.tracking}</div>
        </div>

        {/* Montant */}
        <div style={{ border: "1.5px solid #000", borderRadius: 6, padding: "5px 8px", textAlign: "center" }}>
          <div style={{ fontSize: "7px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>Montant à encaisser</div>
          <div style={{ fontSize: "22px", fontWeight: 900, lineHeight: 1, marginTop: 2 }}>{totalEncaisser.toLocaleString("fr-FR")} DA</div>
        </div>

        {/* Contenu + Départ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2mm", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Package style={{ width: 9, height: 9, flexShrink: 0, color: "#555", marginTop: 1 }} strokeWidth={2} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "6px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>Contenu</div>
              <div style={{ fontSize: "8px", overflow: "hidden", textOverflow: "ellipsis" }}>{colis.description || "Colis"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <MapPin style={{ width: 9, height: 9, flexShrink: 0, color: "#555", marginTop: 1 }} strokeWidth={2} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "6px", fontWeight: 700, textTransform: "uppercase", color: "#555" }}>Départ</div>
              <div style={{ fontSize: "8px" }}>{colis.depart || "—"}</div>
            </div>
          </div>
        </div>

        {/* Date + Signature */}
        <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: "2px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "8px" }}>
            <Calendar style={{ width: 9, height: 9, color: "#555" }} strokeWidth={2} />
            <span>{dateStr}</span>
          </div>
          <div style={{ fontSize: "8px", fontWeight: 700, color: "#555" }}>SIGNATURE</div>
        </div>
      </div>
    </div>
  );
}