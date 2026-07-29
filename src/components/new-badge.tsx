import { useEffect, useState } from "react";

const SEEN_PREFIX = "revo:seen:";

/** Marque un point d'ancrage "Nouveau" pulsé, discret — disparaît définitivement une fois cliqué
 * (ou après un premier survol/clic sur l'élément qu'il annonce), pour ne pas devenir du bruit
 * permanent. Un id stable par fonctionnalité évite qu'il ne réapparaisse après avoir été vu. */
export function useSeenOnce(id: string) {
  const key = SEEN_PREFIX + id;
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    setSeen(typeof window !== "undefined" && localStorage.getItem(key) === "1");
  }, [key]);

  function markSeen() {
    setSeen(true);
    if (typeof window !== "undefined") localStorage.setItem(key, "1");
  }

  return { seen, markSeen };
}

export function NewBadge({ id }: { id: string }) {
  const { seen, markSeen } = useSeenOnce(id);
  if (seen) return null;
  return (
    <span
      onClick={markSeen}
      onMouseEnter={markSeen}
      className="absolute -right-1.5 -top-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary-foreground shadow-sm animate-in fade-in zoom-in-50"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground" />
      New
    </span>
  );
}
