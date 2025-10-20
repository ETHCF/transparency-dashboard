import path from "node:path"
import { fileURLToPath } from "node:url"

import js from "@eslint/js"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import reactPlugin from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url))

export default [
	{
		files: ["**/*.{ts,tsx}"] ,
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				sourceType: "module",
				project: ["./tsconfig.json"],
				tsconfigRootDir,
				ecmaFeatures: {
					jsx: true
				}
			}
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
			"react": reactPlugin,
			"react-hooks": reactHooks
		},
		rules: {
			...js.configs.recommended.rules,
			...tsPlugin.configs.recommended.rules,
			...tsPlugin.configs["recommended-requiring-type-checking"].rules,
			...reactPlugin.configs.flat.recommended.rules,
			...reactHooks.configs.recommended.rules,
			"max-len": ["error", { "code": 90, "tabWidth": 2, "ignoreUrls": true }],
			"quotes": ["error", "double"],
			"semi": ["error", "never"],
			"indent": "off",
			"no-tabs": "off",
			"react/react-in-jsx-scope": "off",
			"react/jsx-uses-react": "off"
		},
		settings: {
			react: {
				version: "detect"
			}
		}
	}
]
