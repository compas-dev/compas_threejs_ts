import path from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"), // ✅ build goes into dist
    emptyOutDir: true, // clears old build
    sourcemap: false, // no sourcemaps needed
    rollupOptions: {
      // vue, three and viewer are also entries, so they keep their exports and fixed
      // names: index.html's import map points plugins at them.
      input: {
        index: path.resolve(import.meta.dirname, "index.html"),
        vue: path.resolve(import.meta.dirname, "src/host/vue.ts"),
        three: path.resolve(import.meta.dirname, "src/host/three.ts"),
        viewer: path.resolve(import.meta.dirname, "src/library/index.ts"),
      },
      preserveEntrySignatures: "strict",
      output: {
        entryFileNames: "assets/[name].js", // no hash in filename
        chunkFileNames: "assets/[name].js", // no hash in chunk filenames
        assetFileNames: "assets/[name][extname]", // no hash in asset filenames
      },
    },
  },
});
