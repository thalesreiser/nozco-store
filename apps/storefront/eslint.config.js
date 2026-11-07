import base from "@nozco/eslint-config"
import vue from "eslint-plugin-vue"
import tseslint from "typescript-eslint"
import { noRawColors } from "./eslint/no-raw-colors.js"

export default [
  { ignores: ["playwright-report/**", "test-results/**"] },
  ...base,
  ...vue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        extraFileExtensions: [".vue"],
      },
    },
  },
  {
    // Only the composables know where data comes from.
    files: ["app/components/**", "app/pages/**", "app/layouts/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["~/data", "~/data/*", "@/data", "@/data/*", "#mock-source", "@medusajs/*"],
              message: "Use useProducts, useCart or useCheckout.",
            },
          ],
        },
      ],
    },
  },
  {
    // Colours come from app/assets/css/tokens.css. tests/design/raw-colours.test.ts covers CSS files.
    files: ["app/components/**", "app/pages/**", "app/layouts/**", "app/*.vue"],
    plugins: { nozco: { rules: { "no-raw-colors": noRawColors } } },
    rules: { "nozco/no-raw-colors": "error" },
  },
  {
    // Nuxt names these components from the file name, which the routing convention fixes.
    files: ["app/pages/**/*.vue", "app/layouts/**/*.vue"],
    rules: { "vue/multi-word-component-names": "off" },
  },
  {
    // shadcn-vue primitives keep the names and optional props of the upstream registry.
    files: ["app/components/ui/**/*.vue"],
    rules: { "vue/multi-word-component-names": "off", "vue/require-default-prop": "off" },
  },
]
