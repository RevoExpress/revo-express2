// Configuration adaptée pour déploiement Node.js (cPanel / Passenger)
// Remplace @lovable.dev/vite-tanstack-config qui ciblait Cloudflare Workers.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      target: "node",
      server: {
        entry: "src/server.ts",
      },
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
});
