// Chaque boutique reçoit toujours la MÊME couleur, calculée depuis son identifiant —
// fini les bulles toutes identiques, chaque commerçant a sa propre teinte reconnaissable.
const PALETTE = [
  { bg: "bg-orange-100", text: "text-orange-700", darkBg: "dark:bg-orange-500/15", darkText: "dark:text-orange-400" },
  { bg: "bg-blue-100", text: "text-blue-700", darkBg: "dark:bg-blue-500/15", darkText: "dark:text-blue-400" },
  { bg: "bg-emerald-100", text: "text-emerald-700", darkBg: "dark:bg-emerald-500/15", darkText: "dark:text-emerald-400" },
  { bg: "bg-purple-100", text: "text-purple-700", darkBg: "dark:bg-purple-500/15", darkText: "dark:text-purple-400" },
  { bg: "bg-pink-100", text: "text-pink-700", darkBg: "dark:bg-pink-500/15", darkText: "dark:text-pink-400" },
  { bg: "bg-cyan-100", text: "text-cyan-700", darkBg: "dark:bg-cyan-500/15", darkText: "dark:text-cyan-400" },
  { bg: "bg-amber-100", text: "text-amber-700", darkBg: "dark:bg-amber-500/15", darkText: "dark:text-amber-400" },
  { bg: "bg-indigo-100", text: "text-indigo-700", darkBg: "dark:bg-indigo-500/15", darkText: "dark:text-indigo-400" },
  { bg: "bg-rose-100", text: "text-rose-700", darkBg: "dark:bg-rose-500/15", darkText: "dark:text-rose-400" },
  { bg: "bg-teal-100", text: "text-teal-700", darkBg: "dark:bg-teal-500/15", darkText: "dark:text-teal-400" },
  { bg: "bg-lime-100", text: "text-lime-700", darkBg: "dark:bg-lime-500/15", darkText: "dark:text-lime-400" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", darkBg: "dark:bg-fuchsia-500/15", darkText: "dark:text-fuchsia-400" },
  { bg: "bg-sky-100", text: "text-sky-700", darkBg: "dark:bg-sky-500/15", darkText: "dark:text-sky-400" },
  { bg: "bg-yellow-100", text: "text-yellow-700", darkBg: "dark:bg-yellow-500/15", darkText: "dark:text-yellow-400" },
  { bg: "bg-violet-100", text: "text-violet-700", darkBg: "dark:bg-violet-500/15", darkText: "dark:text-violet-400" },
  { bg: "bg-red-100", text: "text-red-700", darkBg: "dark:bg-red-500/15", darkText: "dark:text-red-400" },
];

export function boutiqueColorClass(id: string | null | undefined): string {
  const key = id || "?";
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const c = PALETTE[hash % PALETTE.length];
  return `${c.bg} ${c.text} ${c.darkBg} ${c.darkText}`;
}