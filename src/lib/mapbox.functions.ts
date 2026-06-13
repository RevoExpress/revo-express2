import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the public Mapbox token so the browser can render the map.
 * Mapbox `pk.` tokens are designed to be public, but we serve it through a
 * server function to keep configuration in one place.
 */
export const getMapboxToken = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env.MAPBOX_PUBLIC_TOKEN ?? "";
  return { token };
});
