import medusa from "@medusajs/eslint-plugin"
import base from "@nozco/eslint-config"

export default [
  { ignores: [".medusa/**", "integration-tests/setup.js", "jest.config.js"] },
  ...base,
  ...medusa.configs.recommended,
]
