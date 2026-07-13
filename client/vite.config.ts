import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    // @cms-manager/shared is workspace-linked, so Vite treats it as project
    // source and serves its compiled CommonJS output raw via /@fs/ instead
    // of pre-bundling it — the browser's native ESM loader can't parse CJS
    // syntax at all. Forcing it through esbuild's optimizer here converts
    // it to real ESM, same as any other dependency.
    include: ["@cms-manager/shared"],
  },
  build: {
    commonjsOptions: {
      // @cms-manager/shared is a CommonJS workspace package resolved via a
      // symlink; Rollup's commonjs plugin only scans /node_modules/ by
      // default, which misses the symlink's real on-disk path. Without
      // this, named exports silently fail to resolve in production builds.
      include: [/shared/, /node_modules/],
    },
  },
});
