import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist-lib"),
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/library/index.ts"),
      formats: ["es"],
      fileName: "index",
      cssFileName: "style",
    },
    rollupOptions: {
      external: ["vue", "three", /^three\//],
    },
  },
});
