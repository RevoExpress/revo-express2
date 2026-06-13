import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import logoLight from "@/assets/logo-light.png";

type Colis = {
  tracking: string;
  expediteur_nom: string;
  expediteur_tel: string;
  expediteur_adresse: string;
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
};

export function Bordereau({ colis }: { colis: Colis }) {
  const dateStr = new Date().toLocaleDateString("fr-FR").replaceAll("/", "-");
  return (
    <div
      id="bordereau-print"
      dir="ltr"
      className="mx-auto max-w-[420px] rounded-lg border border-black bg-white p-5 text-black"
      style={{ fontFamily: "Arial, sans-serif", color: "#000" }}
    >
      {/* Logo */}
      <div className="mb-3">
        <img src={logoLight} alt="REVO EXPRESS" className="h-32 w-auto" />
      </div>


      {/* Expéditeur */}
      <div className="mb-3 text-sm leading-tight">
        <div className="font-bold">Expéditeur</div>
        <div>{colis.expediteur_nom}</div>
        <div>{colis.expediteur_adresse}</div>
        <div>{colis.expediteur_tel}</div>
      </div>

      {/* Destinataire */}
      <div className="mb-4 text-sm leading-tight">
        <div className="font-bold">Destinataire</div>
        <div>{colis.destinataire_nom}</div>
        {colis.destinataire_cp && <div>{colis.destinataire_cp}</div>}
        <div>
          {colis.destinataire_adresse}
          {colis.destinataire_wilaya ? `, ${colis.destinataire_wilaya}` : ""}
        </div>
        <div>{colis.destinataire_tel}</div>
      </div>

      {/* Barcode + QR + tracking */}
      <div className="my-3 flex items-center justify-between gap-3">
        <div className="flex-1 text-center">
          <Barcode value={colis.tracking} height={56} fontSize={0} displayValue={false} margin={0} />
          <div className="mt-1 font-mono text-xl font-bold tracking-widest">{colis.tracking}</div>
        </div>
        <div className="flex flex-col items-center">
          <QRCodeSVG
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/track/${colis.tracking}`}
            size={72}
            level="M"
            includeMargin={false}
          />
          <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider">Scan</div>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-[11px]" style={{ borderColor: "#000" }}>
        <tbody>
          <tr>
            <td className="border border-black p-1.5 align-top">
              <div className="font-bold">Description du contenu</div>
            </td>
            <td className="border border-black p-1.5 align-top">
              <div className="font-bold">Départ:</div>
            </td>
            <td className="border border-black p-1.5 align-top">
              <div className="font-bold">Recouvrement</div>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1.5 align-top">
              {colis.description || `Accusé de réception de colis ${colis.tracking.toLowerCase()}`}
            </td>
            <td className="border border-black p-1.5 align-top font-bold">
              {colis.depart || "—"}
            </td>
            <td className="border border-black p-1.5 text-right align-top font-bold">
              {Number(colis.prix_colis ?? 0)} DA
            </td>

          </tr>
          <tr>
            <td className="border border-black p-1.5" colSpan={3}>
              <span className="font-bold">Taille:</span> 1x1x1 CM &nbsp;&nbsp;
              <span className="font-bold">Poids facturé:</span> 1KG
            </td>
          </tr>
        </tbody>
      </table>

      {/* Date + signature */}
      <div className="mt-6 text-right text-xs">
        <div>le: {dateStr}</div>
        <div className="font-bold">Signature</div>
      </div>

      {/* Mention légale */}
      <div className="mt-6 text-[10px] leading-snug">
        Je, <strong>{colis.expediteur_nom}</strong>, certifie que les détails déclarés sur ce bordereau sont corrects
        et que le colis ne contient aucun produit dangereux ou interdit par la loi et déclare avoir lu et approuvé
        les conditions générales de transport SARL Revo Express.
      </div>
    </div>
  );
}
