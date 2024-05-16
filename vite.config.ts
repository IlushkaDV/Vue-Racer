import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import electron from "vite-plugin-electron";

export default defineConfig({
	plugins: [
		vue(),
		electron({
			entry: "/electron/main.js",
		}),
	],
	build: {
		outDir: "dist",
		emptyOutDir: true,
	},
	resolve: {
		alias: {
			"@": "./src/renderer",
		},
		// Добавляем настройку для обработки файлов .mjs
		extensions: [".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".vue"],
	},
});
