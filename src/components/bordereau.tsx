import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Phone, MapPin, Package, Calendar } from "lucide-react";
import logoLight from "@/assets/logo-light.png";

type Colis = {
  tracking: string;
  expediteur_nom: string;
  expediteur_tel: string;
  expediteur_adresse: string;
  expediteur_commune?: string | null; // commune de ramassage
  destinataire_nom: string;
  destinataire_tel: string;
  destinataire_adresse: string;
  destinataire_wilaya?: string | null;
  destinataire_cp?: string | null;
  description?: string | null;
  depart?: string | null;
  prix: number;              // frais de livraison
  prix_colis?: number | null; // prix du produit (COD produit)
  type_livraison?: string | null;
  type_colis?: string | null; // "REV" | "SPL" | "ECH" (marquage)
  produit_retour?: string | null; // produit à récupérer (ECH) / renvoyer (SPL)
  notes?: string | null;
};

// Badge de type d'envoi (échange / split) — bien visible
function TypeBadge({ type }: { type?: string | null }) {
  if (!type || type === "REV") return null;
  const label = type === "ECH" ? "ÉCHANGE" : type === "SPL" ? "SPLIT (retour partiel)" : type;
  return (
    <div
      className="mb-3 rounded-md border-2 border-black px-2 py-1 text-center text-sm font-black uppercase tracking-wide"
      style={{ background: "#000", color: "#fff" }}
    >
      {label}
    </div>
  );
}

export function Bordereau({ colis }: { colis: Colis }) {
  const dateStr = new Date().toLocaleDateString("fr-FR").replaceAll("/", "-");
  // Montant unique : produit + livraison fusionnés, jamais détaillés sur le bordereau
  const totalEncaisser = Number(colis.prix_colis ?? 0) + Number(colis.prix ?? 0);

  return (
    <div
      id="bordereau-print"
      dir="ltr"
      className="mx-auto max-w-[400px] rounded-2xl border border-gray-300 bg-white p-5 text-black"
      style={{ fontFamily: "Arial, sans-serif", color: "#000" }}
    >
      {/* En-tête : logo (gauche) + QR (droite) */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <img src={logoLight} alt="REVO EXPRESS" className="h-14 w-auto" />
          <div className="mt-2 text-[11px] leading-tight text-gray-700">
            <div className="font-semibold">SARL Revo Express <span className="font-normal text-gray-400">| Livraison same-day · Alger</span></div>
            <div className="mt-1 flex items-center gap-1">
              <Phone className="h-3 w-3" strokeWidth={2.5} />
              <span className="font-semibold">07 93 46 18 77</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <QRCodeSVG
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/track/${colis.tracking}`}
            size={70}
            level="M"
            includeMargin={false}
          />
          <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-gray-500">Scan</div>
        </div>
      </div>

      <TypeBadge type={colis.type_colis} />

      {/* Produit à récupérer (ECH) / à renvoyer (SPL) — visible sur le retour */}
      {(colis.type_colis === "ECH" || colis.type_colis === "SPL") && (
        <div className="mb-3 rounded-lg border-2 border-black bg-gray-100 p-2 text-sm">
          <div className="text-[10px] font-bold uppercase text-gray-700">
            {colis.type_colis === "ECH" ? "Produit à récupérer" : "Produit à renvoyer au vendeur"}
          </div>
          <div className="font-bold">{colis.produit_retour || "(non précisé)"}</div>
        </div>
      )}

      {/* Expéditeur + Destinataire côte à côte */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {/* Expéditeur */}
        <div className="rounded-xl border border-gray-300 p-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Expéditeur</div>
          <div className="text-sm font-bold">{colis.expediteur_nom}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-700">
            <Phone className="h-3 w-3 shrink-0" strokeWidth={2.5} />
            <span>{colis.expediteur_tel}</span>
          </div>
          <div className="mt-1 flex items-start gap-1 text-xs text-gray-700">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2.5} />
            <span>Ramassage : {colis.expediteur_commune || colis.expediteur_adresse}</span>
          </div>
        </div>
        {/* Destinataire */}
        <div className="rounded-xl border border-gray-300 p-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Destinataire</div>
          <div className="text-sm font-bold">{colis.destinataire_nom}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-700">
            <Phone className="h-3 w-3 shrink-0" strokeWidth={2.5} />
            <span>{colis.destinataire_tel}</span>
          </div>
          <div className="mt-1 flex items-start gap-1 text-xs text-gray-700">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2.5} />
            <span>{colis.destinataire_adresse}{colis.destinataire_wilaya ? `, ${colis.destinataire_wilaya}` : ""}</span>
          </div>
        </div>
      </div>

      {/* Code-barres + tracking */}
      <div className="mb-4 text-center">
        <Barcode value={colis.tracking} height={56} fontSize={0} displayValue={false} margin={0} width={2} />
        <div className="mt-1 font-mono text-xl font-bold tracking-[0.2em]">{colis.tracking}</div>
      </div>

      {/* Montant à encaisser — UN SEUL chiffre, jamais de détail */}
      <div className="mb-4 rounded-xl border border-gray-300 py-3 text-center">
        <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Montant à encaisser</div>
        <div className="text-3xl font-black leading-none">{totalEncaisser.toLocaleString("fr-FR")} DA</div>
      </div>

      {/* Contenu + Départ côte à côte (avec icônes) */}
      <div className="mb-3 grid grid-cols-2 gap-3 border-t border-gray-200 pt-3">
        <div className="flex items-start gap-2">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" strokeWidth={2} />
          <div>
            <div className="text-[10px] font-bold uppercase text-gray-500">Contenu</div>
            <div className="text-sm">{colis.description || "Colis"}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" strokeWidth={2} />
          <div>
            <div className="text-[10px] font-bold uppercase text-gray-500">Départ</div>
            <div className="text-sm">{colis.depart || "—"}</div>
          </div>
        </div>
      </div>

      {/* Note optionnelle */}
      {colis.notes && (
        <div className="mb-3 rounded-lg bg-gray-50 p-2 text-xs">
          <span className="font-bold">Note :</span> {colis.notes}
        </div>
      )}

      {/* Date + Signature */}
      <div className="mb-3 grid grid-cols-2 gap-3 border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-gray-600" strokeWidth={2} />
          <span className="text-sm font-medium">LE : {dateStr}</span>
        </div>
        <div className="text-right text-sm font-bold text-gray-700">SIGNATURE</div>
      </div>

      {/* Mention légale */}
      <div className="border-t border-gray-200 pt-2 text-[8px] leading-snug text-gray-500">
        Je, {colis.expediteur_nom}, certifie que les détails déclarés sur ce bordereau sont corrects et que le colis ne
        contient aucun produit dangereux ou interdit par la loi, et déclare avoir lu et approuvé les conditions générales
        de transport SARL Revo Express.
      </div>
    </div>
  );
}