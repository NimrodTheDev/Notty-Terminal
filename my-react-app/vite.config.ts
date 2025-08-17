import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";

export default defineConfig({
	plugins: [react()],
	define: {
		"process.env": {},
		global: "globalThis", // ✅ add this so "global" works in browser
	},
	resolve: {
		alias: {
			process: "process/browser",
			stream: "stream-browserify",
			zlib: "browserify-zlib",
			util: "util",
			buffer: "buffer",
			"bn.js": "bn.js",
		},
	},
	optimizeDeps: {
		include: ["buffer", "bn.js"],
		esbuildOptions: {
			define: {
				global: "globalThis",
			},
			plugins: [
				NodeGlobalsPolyfillPlugin({
					process: true,
					buffer: true,
				}),
			],
		},
	},
});
