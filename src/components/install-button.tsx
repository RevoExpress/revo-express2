import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useI18n } from "@/hooks/use-i18n";

export function InstallButton({ className }: { className?: string }) {
  const { canInstall, install } = useInstallPrompt();
  const { t } = useI18n();
  if (!canInstall) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void install()}
      className={`gap-2 border-primary/40 text-primary hover:bg-primary/10 ${className ?? ""}`}
    >
      <Download className="h-4 w-4" />
      {t("nav.install")}
    </Button>
  );
}
