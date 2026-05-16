import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname),
  base: "/miniapp/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
});
