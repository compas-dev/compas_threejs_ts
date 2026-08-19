import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist-lib"),
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: {
        index: path.resolve(import.meta.dirname, "src/library/index.ts"),
        ui: path.resolve(import.meta.dirname, "src/library/ui.ts"),
      },
      formats: ["es"],
      cssFileName: "style",
    },
    rollupOptions: {
      external: ["vue", "three", /^three\//],
    },
  },
});
