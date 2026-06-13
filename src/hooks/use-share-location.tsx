import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type GeoStatus = "idle" | "requesting" | "active" | "denied" | "error" | "unsupported";

/**
 * Shares the current livreur's GPS position with the backend.
 * Writes to public.livreur_positions (RLS: a livreur can only upsert its own row).
 */
export function useShareLocation(livreurId: string | undefined) {
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [lastFix, setLastFix] = useState<{ lat: number; lng: number; at: number } | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);

  const push = useCallback(
    async (pos: GeolocationPosition) => {
      if (!livreurId) return;
      const { latitude, longitude, accuracy, speed, heading } = pos.coords;
      setLastFix({ lat: latitude, lng: longitude, at: Date.now() });
      // Throttle DB writes to once every 8s
      const now = Date.now();
      if (now - lastSent.current < 8000) return;
      lastSent.current = now;
      await supabase.from("livreur_positions").upsert({
        livreur_id: livreurId,
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        speed: speed ?? null,
        heading: heading ?? null,
        updated_at: new Date().toISOString(),
      });
    },
    [livreurId],
  );

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSharing(false);
    setStatus("idle");
  }, []);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    setSharing(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus("active");
        void push(pos);
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, [push]);

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  return { sharing, status, lastFix, start, stop };
}
