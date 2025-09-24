import { TanStackRouterVite } from "@tanstack/router-vite-plugin"
import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"

export default defineConfig({
	plugins: [TanStackRouterVite(), react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src")
		}
	},
	server: {
		port: 3000
	},
	preview: {
		port: 4173
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: "./vitest.setup.ts",
		coverage: {
			reporter: ["text", "lcov"],
			exclude: ["src/types/generated/**", "src/**/*.d.ts"]
		}
	}
})
