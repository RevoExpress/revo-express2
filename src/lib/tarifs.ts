// REVO EXPRESS — tarifs, statuts et communes d'Alger

// ─── TARIFS OFFICIELS ───────────────────────────────────────────
export const STANDARD_PRICE = 500;

export const TARIFFS = [
  { maxKm: 10, price: 1000 },
  { maxKm: 20, price: 1300 },
  { maxKm: 50, price: 1500 },
] as const;

export type DeliveryType = "standard" | "urgent";

export function priceForKm(km: number): number {
  for (const t of TARIFFS) if (km <= t.maxKm) return t.price;
  return TARIFFS[TARIFFS.length - 1].price;
}

export function priceForDelivery(km: number, type: DeliveryType): number {
  return type === "standard" ? STANDARD_PRICE : priceForKm(km);
}

// ─── COD ────────────────────────────────────────────────────────
export function totalCOD(
  prixProduit: number,
  fraisLivraison: number,
  fraisPayesParExpediteur?: boolean,
): number {
  return fraisPayesParExpediteur ? prixProduit : prixProduit + fraisLivraison;
}

// ─── STATUTS OFFICIELS ──────────────────────────────────────────
export const STATUTS = [
  { key: "en-preparation", label: "En préparation", color: "warning" },
  { key: "ramasse", label: "Ramassé", color: "info" },
  { key: "expedie", label: "Expédié", color: "info" },
  { key: "en-livraison", label: "En livraison", color: "info" },
  { key: "contact-client", label: "Contact client", color: "warning" },
  { key: "client-injoignable-1", label: "Client injoignable 1", color: "warning" },
  { key: "client-injoignable-2", label: "Client injoignable 2", color: "warning" },
  { key: "client-injoignable-3", label: "Client injoignable 3", color: "destructive" },
  { key: "livre", label: "Livré", color: "success" },
  { key: "reporte", label: "Reporté", color: "warning" },
  { key: "echec-livraison", label: "Échec de livraison", color: "destructive" },
  { key: "retourne-vendeur", label: "Retourné au vendeur", color: "destructive" },
  { key: "annule", label: "Annulé", color: "destructive" },
] as const;

export type StatutKey = (typeof STATUTS)[number]["key"];

export const STATUTS_FREQUENTS: StatutKey[] = [
  "en-preparation", "ramasse", "en-livraison", "livre",
];

export function statutInfo(key: string) {
  return (
    STATUTS.find((s) => s.key === key) ?? {
      key,
      label: key,
      color: "warning" as const,
    }
  );
}

// ─── COMMUNES D'ALGER — liste officielle complète (57 + Dergana), triée A→Z ───
export type Commune = { name: string; lat: number; lng: number };

export const COMMUNES: Commune[] = [
  { name: "Ain Benian", lat: 36.8028, lng: 2.9219 },
  { name: "Ain Taya", lat: 36.7949, lng: 3.2879 },
  { name: "Alger Centre", lat: 36.7753, lng: 3.0602 },
  { name: "Baba Hassen", lat: 36.735, lng: 2.97 },
  { name: "Bab El Oued", lat: 36.7922, lng: 3.0491 },
  { name: "Bab Ezzouar", lat: 36.7134, lng: 3.1838 },
  { name: "Bach Djerrah", lat: 36.728, lng: 3.115 },
  { name: "Baraki", lat: 36.6668, lng: 3.0961 },
  { name: "Belouizdad", lat: 36.7506, lng: 3.0789 },
  { name: "Ben Aknoun", lat: 36.7595, lng: 3.0164 },
  { name: "Beni Messous", lat: 36.77, lng: 2.995 },
  { name: "Bir Mourad Rais", lat: 36.7343, lng: 3.0507 },
  { name: "Birkhadem", lat: 36.7142, lng: 3.05 },
  { name: "Birtouta", lat: 36.6464, lng: 3.015 },
  { name: "Bologhine", lat: 36.8056, lng: 3.0436 },
  { name: "Bordj El Bahri", lat: 36.7877, lng: 3.2397 },
  { name: "Bordj El Kiffan", lat: 36.7487, lng: 3.192 },
  { name: "Bourouba", lat: 36.735, lng: 3.108 },
  { name: "Bouzareah", lat: 36.7975, lng: 3.018 },
  { name: "Casbah", lat: 36.7844, lng: 3.0603 },
  { name: "Cheraga", lat: 36.7669, lng: 2.9592 },
  { name: "Dar El Beida", lat: 36.7133, lng: 3.2125 },
  { name: "Dely Ibrahim", lat: 36.7525, lng: 2.9828 },
  { name: "Dergana", lat: 36.7701, lng: 3.2664 },
  { name: "Douera", lat: 36.6727, lng: 2.9443 },
  { name: "Draria", lat: 36.714, lng: 3.0017 },
  { name: "El Achour", lat: 36.7227, lng: 2.9928 },
  { name: "El Biar", lat: 36.769, lng: 3.0332 },
  { name: "El Harrach", lat: 36.717, lng: 3.1372 },
  { name: "El Madania", lat: 36.7457, lng: 3.067 },
  { name: "El Magharia", lat: 36.735, lng: 3.085 },
  { name: "El Marsa", lat: 36.8, lng: 3.22 },
  { name: "El Mouradia", lat: 36.755, lng: 3.058 },
  { name: "Gué de Constantine", lat: 36.6982, lng: 3.0896 },
  { name: "Hammamet", lat: 36.755, lng: 3.205 },
  { name: "H'Raoua", lat: 36.77, lng: 3.3 },
  { name: "Hussein Dey", lat: 36.7406, lng: 3.101 },
  { name: "Hydra", lat: 36.7442, lng: 3.0431 },
  { name: "Khraissia", lat: 36.7, lng: 2.96 },
  { name: "Kouba", lat: 36.7289, lng: 3.0873 },
  { name: "Les Eucalyptus", lat: 36.695, lng: 3.145 },
  { name: "Mahelma", lat: 36.72, lng: 2.87 },
  { name: "Mohammadia", lat: 36.7321, lng: 3.1539 },
  { name: "Oued Koriche", lat: 36.7833, lng: 3.05 },
  { name: "Oued Smar", lat: 36.7064, lng: 3.1684 },
  { name: "Ouled Chebel", lat: 36.62, lng: 3.05 },
  { name: "Ouled Fayet", lat: 36.7402, lng: 2.9461 },
  { name: "Rahmania", lat: 36.69, lng: 2.89 },
  { name: "Rais Hamidou", lat: 36.81, lng: 3.065 },
  { name: "Reghaia", lat: 36.7397, lng: 3.3447 },
  { name: "Rouiba", lat: 36.7367, lng: 3.2806 },
  { name: "Saoula", lat: 36.6939, lng: 3.0455 },
  { name: "Sidi M'Hamed", lat: 36.7619, lng: 3.0556 },
  { name: "Sidi Moussa", lat: 36.61, lng: 3.13 },
  { name: "Souidania", lat: 36.735, lng: 2.86 },
  { name: "Staoueli", lat: 36.7544, lng: 2.8869 },
  { name: "Tessala El Merdja", lat: 36.635, lng: 3.035 },
  { name: "Zeralda", lat: 36.7058, lng: 2.8419 },
];

export function haversineKm(a: Commune, b: Commune): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function generateTracking(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return "REV-" + code;
}