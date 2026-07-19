import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function openBordereauSingle(tracking: string) {
  window.open(`/print/${tracking}`, "_blank");
}
export function openBordereauMulti(ids: string[]) {
  if (!ids.length) return;
  window.open(`/print-bordereaux?ids=${encodeURIComponent(ids.join(","))}`, "_blank");
}

export function PrintBordereauButton({ tracking, size = "icon" }: { tracking: string; size?: "icon" | "sm" | "default" }) {
  return (
    <Button
      size={size as any}
      variant="outline"
      className="h-8 w-8 text-info"
      onClick={() => openBordereauSingle(tracking)}
      title="Imprimer le bordereau"
    >
      <Printer className="h-4 w-4" />
    </Button>
  );
}