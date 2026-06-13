// REVO EXPRESS — tarifs et communes d'Alger

export const TARIFFS = [
  { maxKm: 1, price: 300 },
  { maxKm: 3, price: 400 },
  { maxKm: 5, price: 500 },
  { maxKm: 7, price: 600 },
  { maxKm: 10, price: 750 },
  { maxKm: 15, price: 1000 },
  { maxKm: 20, price: 1250 },
  { maxKm: 30, price: 1600 },
  { maxKm: 50, price: 2200 },
] as const;

export type Commune = { name: string; lat: number; lng: number };

export const COMMUNES: Commune[] = [
  { name: "Ain Benian", lat: 36.8028, lng: 2.9219 },
  { name: "Ain Taya", lat: 36.7949, lng: 3.2879 },
  { name: "Alger Centre", lat: 36.7753, lng: 3.0602 },
  { name: "Bab El Oued", lat: 36.7922, lng: 3.0491 },
  { name: "Bab Ezzouar", lat: 36.7134, lng: 3.1838 },
  { name: "Baraki", lat: 36.6668, lng: 3.0961 },
  { name: "Belouizdad", lat: 36.7506, lng: 3.0789 },
  { name: "Ben Aknoun", lat: 36.7595, lng: 3.0164 },
  { name: "Bir Mourad Rais", lat: 36.7343, lng: 3.0507 },
  { name: "Birkhadem", lat: 36.7142, lng: 3.05 },
  { name: "Birtouta", lat: 36.6464, lng: 3.015 },
  { name: "Bologhine", lat: 36.8056, lng: 3.0436 },
  { name: "Bordj El Bahri", lat: 36.7877, lng: 3.2397 },
  { name: "Bordj El Kiffan", lat: 36.7487, lng: 3.192 },
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
  { name: "Gué de Constantine", lat: 36.6982, lng: 3.0896 },
  { name: "Hussein Dey", lat: 36.7406, lng: 3.101 },
  { name: "Hydra", lat: 36.7442, lng: 3.0431 },
  { name: "Kouba", lat: 36.7289, lng: 3.0873 },
  { name: "Mohammadia", lat: 36.7321, lng: 3.1539 },
  { name: "Oued Smar", lat: 36.7064, lng: 3.1684 },
  { name: "Ouled Fayet", lat: 36.7402, lng: 2.9461 },
  { name: "Reghaia", lat: 36.7397, lng: 3.3447 },
  { name: "Rouiba", lat: 36.7367, lng: 3.2806 },
  { name: "Saoula", lat: 36.6939, lng: 3.0455 },
  { name: "Sidi M'Hamed", lat: 36.7619, lng: 3.0556 },
  { name: "Staoueli", lat: 36.7544, lng: 2.8869 },
  { name: "Zeralda", lat: 36.7058, lng: 2.8419 },
];

// Distance Haversine (km)
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

export const STANDARD_PRICE = 500; // forfait standard, toutes distances

export type DeliveryType = "standard" | "urgent";

export function priceForKm(km: number): number {
  for (const t of TARIFFS) if (km <= t.maxKm) return t.price;
  return TARIFFS[TARIFFS.length - 1].price + Math.ceil((km - 50) / 10) * 300;
}

export function priceForDelivery(km: number, type: DeliveryType): number {
  return type === "standard" ? STANDARD_PRICE : priceForKm(km);
}

// Tracking style REV-XXXXXX
export function generateTracking(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return "REV-" + code;
}

export const STATUTS = [
  { key: "en-attente", label: "En attente", color: "warning" },
  { key: "pris-en-charge", label: "Pris en charge", color: "info" },
  { key: "en-cours", label: "En cours de livraison", color: "info" },
  { key: "livre", label: "Livré", color: "success" },
  { key: "echec", label: "Échec / Retour", color: "destructive" },
] as const;

export type StatutKey = (typeof STATUTS)[number]["key"];
