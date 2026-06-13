import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { X, Camera, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  onDetected: (text: string) => void;
  title?: string;
};

/**
 * Barcode scanner modal — uses the device camera via @zxing/browser.
 * Optimized for Code 128 / QR codes (REVO tracking labels).
 */
export function BarcodeScanner({ open, onClose, onDetected, title = "Scanner un colis" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const lastDetectRef = useRef<{ text: string; ts: number } | null>(null);

  // Enumerate cameras when the modal opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    setStarting(true);
    (async () => {
      try {
        // Request permission so labels become available
        const tmp = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        tmp.getTracks().forEach((t) => t.stop());

        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        setDevices(list);
        // Prefer back camera if obvious from label
        const back = list.find((d) => /back|rear|environment|arrière/i.test(d.label));
        setDeviceId((back ?? list[list.length - 1] ?? list[0])?.deviceId);
      } catch (e: any) {
        setError(
          e?.name === "NotAllowedError"
            ? "Accès caméra refusé. Autorisez la caméra dans les réglages du navigateur."
            : "Impossible d'accéder à la caméra : " + (e?.message ?? "erreur inconnue"),
        );
        setStarting(false);
      }
    })();
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open]);

  // Start decoding when a deviceId is selected
  useEffect(() => {
    if (!open || !deviceId || !videoRef.current) return;
    let cancelled = false;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);

    (async () => {
      try {
        controlsRef.current?.stop();
        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, _err) => {
            if (!result) return;
            const text = result.getText().trim();
            const now = Date.now();
            // Debounce: avoid firing the same code multiple times in 2s
            if (lastDetectRef.current && lastDetectRef.current.text === text && now - lastDetectRef.current.ts < 2000) return;
            lastDetectRef.current = { text, ts: now };
            // Vibrate if supported
            if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(80);
            onDetected(text);
          },
        );
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
        setStarting(false);
      } catch (e: any) {
        setError("Erreur scanner : " + (e?.message ?? "inconnu"));
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, deviceId, onDetected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-card p-3">
          <div className="flex items-center gap-2 font-bold">
            <Camera className="h-4 w-4 text-primary" /> {title}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative aspect-square bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

          {/* Targeting overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-2/3 w-5/6 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              <div className="absolute left-0 right-0 top-1/2 h-px animate-pulse bg-primary" />
            </div>
          </div>

          {starting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Démarrage caméra…
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-sm text-white">
              {error}
            </div>
          )}
        </div>

        {devices.length > 1 && (
          <div className="border-t border-border p-3">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Caméra</label>
            <div className="flex items-center gap-2">
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Caméra ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  // Cycle to next camera
                  const idx = devices.findIndex((d) => d.deviceId === deviceId);
                  const next = devices[(idx + 1) % devices.length];
                  if (next) setDeviceId(next.deviceId);
                }}
                title="Caméra suivante"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="border-t border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          Pointez la caméra vers le code-barres du bordereau.
        </div>
      </div>
    </div>
  );
}
