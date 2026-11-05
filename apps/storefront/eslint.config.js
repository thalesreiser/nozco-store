import base from "@nozco/eslint-config"
import vue from "eslint-plugin-vue"
import tseslint from "typescript-eslint"

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
