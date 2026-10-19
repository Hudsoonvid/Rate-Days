import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base + hash routing means the build works from any sub-path
// (GitHub Pages project sites, a file share, a phone's local server, ...).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 700,
  },
});
