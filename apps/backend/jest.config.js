const { loadEnv } = require("@medusajs/framework/utils")
loadEnv("test", process.cwd())

module.exports = {
  transform: {
    "^.+\.[jt]s$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
        },
      },
    ],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts", "json"],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/.medusa/"],
  setupFiles: ["./integration-tests/setup.js"],
  // Jest cannot require an ES module, as Node.js does. It reads the package's TypeScript sources
  // instead, whose relative imports end in `.js`.
  moduleNameMapper: {
    "^@nozco/shared-types$": "<rootDir>/../../packages/shared-types/src/index.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
}

if (process.env.TEST_TYPE === "integration") {
  module.exports.testMatch = [
    "**/integration-tests/http/*.spec.[jt]s",
    "**/src/modules/*/__tests__/**/*.[jt]s",
  ]
  module.exports.testPathIgnorePatterns = ["/node_modules/", "\.unit\.spec\.[jt]s$"]
} else if (process.env.TEST_TYPE === "unit") {
  module.exports.testMatch = ["**/src/**/__tests__/**/*.unit.spec.[jt]s"]
}
