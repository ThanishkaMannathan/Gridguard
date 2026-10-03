import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Only polyfill Buffer — we don't need full Node.js compat
      include: ["buffer"],
      globals: { Buffer: true },
    }),
  ],
  server: {
    port: 5173,
  },
});
