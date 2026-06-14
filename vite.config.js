import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" -> relative asset paths so the build works on any GitHub Pages path
// (user/repo subpath) AND on a custom domain without reconfiguring.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "dist", chunkSizeWarningLimit: 1200 },
});
