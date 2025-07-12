import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import inject from "@rollup/plugin-inject";

export default defineConfig({
  plugins: [
    react(),
    inject({
      Buffer: ["buffer", "Buffer"]
    })
  ],
  define: {
    "process.env": {}
  },
  resolve: {
    alias: {
      process: "process/browser",
      stream: "stream-browserify",
      zlib: "browserify-zlib",
      util: "util",
      buffer: "buffer",
      "bn.js": "bn.js"
    }
  },
  optimizeDeps: {
    include: ["buffer", "bn.js"],
    esbuildOptions: {
      define: {
        global: "globalThis"
      }
    }
  }
});
