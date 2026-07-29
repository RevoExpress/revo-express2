import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, MapPin, Store, Map as MapIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProPageHeader } from "@/components/pro-page-header";
import { getMapboxToken } from "@/lib/mapbox.functions";
import { listClientsCarte } from "@/lib/commercial.functions";

export const Route = createFileRoute("/_authenticated/carte-clients")({
  head: () => ({ meta: [{ title: "Carte des clients — REVO EXPRESS" }] }),
  component: CarteClientsPage,
});

const ALLOWED = new Set(["admin", "directeur_commercial", "admin_commercial", "commercial", "admin_operations", "admin_service_client"]);

function fmtDA(n: number) {
  return new Intl.NumberFormat("fr-DZ").format(Math.round(n)) + " DA";
}

function CarteClientsPage() {
  const { role, loading } = useAuth();
  const tokenFn = useServerFn(getMapboxToken);
  const listFn = useServerFn(listClientsCarte);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [sansPosition, setSansPosition] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [filtreWilaya, setFiltreWilaya] = useState("");
  const [filtreCommercial, setFiltreCommercial] = useState("");
  const [volumeMin, setVolumeMin] = useState(0);

  const allowed = !!role && ALLOWED.has(role);

  useEffect(() => {
    if (!allowed) return;
    listFn().then((r) => { setClients(r.clients); setSansPosition(r.sansPosition); }).catch(() => {}).finally(() => setDataLoading(false));
  }, [role]);

  useEffect(() => {
    if (!allowed || !mapContainer.current || map.current) return;
    void (async () => {
      const { token } = await tokenFn();
      if (!token) { setTokenMissing(true); return; }
      mapboxgl.accessToken = token;
      map.current = new mapboxgl.Map({
        container: mapContainer.current!, style: "mapbox://styles/mapbox/streets-v12",
        center: [3.06, 36.75], zoom: 6,
      });
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    })();
  }, [allowed, tokenFn]);

  const wilayas = useMemo(() => Array.from(new Set(clients.map((c) => c.wilaya).filter(Boolean))).sort(), [clients]);
  const commerciaux = useMemo(() => Array.from(new Set(clients.map((c) => c.commercial_nom).filter(Boolean))).sort(), [clients]);

  const filtres = useMemo(() => clients.filter((c) =>
    (!filtreWilaya || c.wilaya === filtreWilaya) &&
    (!filtreCommercial || c.commercial_nom === filtreCommercial) &&
    c.nb_colis >= volumeMin
  ), [clients, filtreWilaya, filtreCommercial, volumeMin]);

  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach((m) => m.remove());
    markers.current = [];
    filtres.forEach((c) => {
      const el = document.createElement("div");
      el.className = "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-white cursor-pointer";
      el.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><path d='M9 22V12h6v10'/></svg>";
      const popupHtml = `<strong>${c.nom}</strong><br/>${c.wilaya ?? ""} ${c.commune ?? ""}<br/>${c.nb_colis} colis — ${fmtDA(c.ca)}`;
      const marker = new mapboxgl.Marker(el)
        .setLngLat([c.lng, c.lat])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(popupHtml))
        .addTo(map.current!);
      markers.current.push(marker);
    });
  }, [filtres]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!allowed) return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <ProPageHeader icon={MapIcon} title="Carte des clients" subtitle={`${filtres.length} client${filtres.length > 1 ? "s" : ""} affiché${filtres.length > 1 ? "s" : ""}${sansPosition > 0 ? ` — ${sansPosition} sans position GPS enregistrée` : ""}.`} />

        {dataLoading ? (
          <div className="mt-8 flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : tokenMissing ? (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-destructive" />
            <h2 className="mt-3 font-bold">Token Mapbox manquant</h2>
          </div>
        ) : (
          <>
            <div className="mt-4 mb-4 flex flex-wrap gap-2">
              <select value={filtreWilaya} onChange={(e) => setFiltreWilaya(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Toutes wilayas</option>
                {wilayas.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              {commerciaux.length > 0 && (
                <select value={filtreCommercial} onChange={(e) => setFiltreCommercial(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Tous commerciaux</option>
                  {commerciaux.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <select value={volumeMin} onChange={(e) => setVolumeMin(Number(e.target.value))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                <option value={0}>Tous volumes</option>
                <option value={5}>5+ colis</option>
                <option value={20}>20+ colis</option>
                <option value={50}>50+ colis</option>
              </select>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <div className="lg:col-span-3 overflow-hidden rounded-2xl border border-border shadow-card">
                <div ref={mapContainer} className="h-[60vh] w-full" />
              </div>
              <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                {filtres.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">Aucun client à afficher avec ces filtres.</p>
                )}
                {filtres.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => map.current?.flyTo({ center: [c.lng, c.lat], zoom: 14 })}
                    className="w-full rounded-xl border border-border bg-card p-3 text-left hover:bg-accent/40"
                  >
                    <div className="flex items-center gap-1.5 font-bold"><Store className="h-3.5 w-3.5 text-primary" /> {c.nom}</div>
                    <div className="text-xs text-muted-foreground">{c.wilaya} {c.commune ? `· ${c.commune}` : ""}</div>
                    <div className="mt-1 text-xs font-semibold">{c.nb_colis} colis — {fmtDA(c.ca)}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
