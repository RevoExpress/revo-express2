import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { getReversementDetail } from "@/lib/finance.functions";
import logoLight from "@/assets/logo-light.png";

export const Route = createFileRoute("/_authenticated/print-reversement/$id")({
  head: () => ({ meta: [{ title: "Reçu de reversement — REVO EXPRESS" }] }),
  component: PrintReversementPage,
});

function PrintReversementPage() {
  const { id } = useParams({ from: "/_authenticated/print-reversement/$id" });
  const detailFn = useServerFn(getReversementDetail);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    detailFn({ data: { id } }).then(setData).catch(() => setData(null));
  }, [id]);

  useEffect(() => {
    if (!data) return;
    const doPrint = () => window.print();
    if (document.readyState === "complete") {
      const t = setTimeout(doPrint, 500);
      return () => clearTimeout(t);
    }
    window.addEventListener("load", doPrint);
    return () => window.removeEventListener("load", doPrint);
  }, [data]);

  if (!data) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const { reversement, profil, colis } = data;

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 15mm; }
        html, body { background: #fff; margin: 0; }
        @media screen { body { padding: 20px; background: #f4f4f4; } }
        @media print { .no-print { display: none !important; } }
      `}</style>
      <div className="no-print" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
        <button onClick={() => window.print()} style={{ background: "#f97316", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
          Imprimer / Enregistrer en PDF
        </button>
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto", background: "#fff", padding: 24, fontFamily: "Arial, sans-serif", color: "#000" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #000", paddingBottom: 12, marginBottom: 20 }}>
          <img src={logoLight} alt="REVO EXPRESS" style={{ height: 40 }} />
          <div style={{ textAlign: "right", fontSize: 12 }}>
            <div style={{ fontWeight: 700 }}>SARL Revo Express</div>
            <div>07 93 46 18 77</div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Reçu de reversement</h1>
        <p style={{ fontSize: 13, color: "#555", marginBottom: 20 }}>
          Référence : <b>{reversement.reference}</b> — {new Date(reversement.created_at).toLocaleString("fr-FR")}
        </p>

        <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#555" }}>Boutique</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{profil?.nom_boutique || profil?.nom || "—"}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
              <th style={{ padding: "6px 4px" }}>Tracking</th>
              <th style={{ padding: "6px 4px" }}>Destinataire</th>
              <th style={{ padding: "6px 4px", textAlign: "right" }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {colis.map((c: any, i: number) => {
              const montant = c.frais_payes_par_expediteur ? Number(c.prix_colis) - Number(c.prix) : Number(c.prix_colis);
              return (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px 4px", fontFamily: "monospace" }}>{c.tracking}</td>
                  <td style={{ padding: "6px 4px" }}>{c.destinataire_nom}</td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>{montant.toLocaleString("fr-FR")} DA</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "2px solid #000", paddingTop: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#555" }}>Total reversé</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{Number(reversement.montant_total).toLocaleString("fr-FR")} DA</div>
          </div>
        </div>
      </div>
    </>
  );
}