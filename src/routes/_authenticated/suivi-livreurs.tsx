import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, MapPin, Truck, RadioTower } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProPageHeader } from "@/components/pro-page-header";
import { getMapboxToken } from "@/lib/mapbox.functions";

export const Route = createFileRoute("/_authenticated/suivi-livreurs")({
  head: () => ({ meta: [{ title: "Suivi des livreurs — REVO EXPRESS" }] }),
  component: SuiviLivreursPage,
});

type Position = {
  livreur_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  updated_at: string;
};

function SuiviLivreursPage() {
  const { role, loading } = useAuth();
  const tokenFn = useServerFn(getMapboxToken);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Record<string, mapboxgl.Marker>>({});
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [tokenMissing, setTokenMissing] = useState(false);

  const isAdmin = role === "admin" || role === "admin_operations";

  // Load livreur names
  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const { data } = await supabase.from("profiles").select("id, nom");
      const m: Record<string, string> = {};
      (data ?? []).forEach((p: any) => { m[p.id] = p.nom || "Livreur"; });
      setNames(m);
    })();
  }, [isAdmin]);

  // Init map
  useEffect(() => {
    if (!isAdmin || !mapContainer.current || map.current) return;
    void (async () => {
      const { token } = await tokenFn();
      if (!token) { setTokenMissing(true); return; }
      mapboxgl.accessToken = token;
      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [3.06, 36.75], // Alger
        zoom: 6,
      });
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    })();
  }, [isAdmin, tokenFn]);

  // Load + subscribe to positions
  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const { data, error } = await supabase.from("livreur_positions").select("*");
      if (error) { toast.error(error.message); return; }
      const m: Record<string, Position> = {};
      (data ?? []).forEach((p: any) => { m[p.livreur_id] = p; });
      setPositions(m);
    })();

    const ch = supabase.channel("livreur-positions-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "livreur_positions" }, (payload) => {
        const row = payload.new as Position;
        if (row?.livreur_id) setPositions((prev) => ({ ...prev, [row.livreur_id]: row }));
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [isAdmin]);

  // Render markers
  useEffect(() => {
    if (!map.current) return;
    Object.values(positions).forEach((p) => {
      const lngLat: [number, number] = [p.longitude, p.latitude];
      const label = names[p.livreur_id] ?? "Livreur";
      if (markers.current[p.livreur_id]) {
        markers.current[p.livreur_id].setLngLat(lngLat);
      } else {
        const el = document.createElement("div");
        el.className = "flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-white";
        el.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10 17h4V5H2v12h3'/><path d='M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1'/><circle cx='7.5' cy='17.5' r='2.5'/><circle cx='17.5' cy='17.5' r='2.5'/></svg>";
        markers.current[p.livreur_id] = new mapboxgl.Marker(el)
          .setLngLat(lngLat)
          .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(`<strong>${label}</strong>`))
          .addTo(map.current!);
      }
    });
  }, [positions, names]);

  const activeList = useMemo(() => Object.values(positions).sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [positions]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <ProPageHeader icon={RadioTower} title="Suivi des livreurs" subtitle="Position des livreurs en temps réel." />

        {tokenMissing ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-destructive" />
            <h2 className="mt-3 font-bold">Token Mapbox manquant</h2>
            <p className="text-sm text-muted-foreground">Configurez le token public Mapbox pour afficher la carte.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-3 overflow-hidden rounded-2xl border border-border shadow-card">
              <div ref={mapContainer} className="h-[60vh] w-full" />
            </div>
            <div className="space-y-2">
              <h2 className="flex items-center gap-2 font-bold"><Truck className="h-4 w-4 text-primary" /> En ligne ({activeList.length})</h2>
              {activeList.length === 0 && (
                <p className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                  Aucun livreur ne partage sa position pour le moment.
                </p>
              )}
              {activeList.map((p) => (
                <button
                  key={p.livreur_id}
                  onClick={() => map.current?.flyTo({ center: [p.longitude, p.latitude], zoom: 14 })}
                  className="w-full rounded-xl border border-border bg-card p-3 text-left hover:bg-accent/40"
                >
                  <div className="font-bold">{names[p.livreur_id] ?? "Livreur"}</div>
                  <div className="text-xs text-muted-foreground">
                    Maj : {new Date(p.updated_at).toLocaleTimeString("fr-FR")}
                    {p.speed != null && p.speed > 0 && ` • ${Math.round(p.speed * 3.6)} km/h`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
