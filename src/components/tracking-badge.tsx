// Petit badge affiché à côté d'un tracking pour signaler qu'un colis
// générera (ou est) un retour Échange (ECH) ou Split (SPL).
// Visible partout où le tracking est affiché, pour que tout interne le voie.

import { useI18n } from "@/hooks/use-i18n";

export function TrackingBadge({ typeColis }: { typeColis?: string | null }) {
  const { t } = useI18n();
  if (typeColis !== "ECH" && typeColis !== "SPL") return null;
  const isEch = typeColis === "ECH";
  return (
    <span
      dir="ltr"
      className={`ms-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        isEch
          ? "bg-blue-600 text-white"
          : "bg-purple-600 text-white"
      }`}
      title={isEch ? t("tbg.ech.title") : t("tbg.spl.title")}
    >
      {isEch ? "ÉCH" : "SPL"}
    </span>
  );
}
