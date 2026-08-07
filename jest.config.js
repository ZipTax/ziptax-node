module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Sources write relative imports with an explicit .js extension so the ESM
  // build is loadable by Node, which does not resolve extensionless specifiers.
  // TypeScript maps './client.js' back to './client.ts' when compiling; Jest
  // does not, so strip the extension for module resolution here.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/utils/http.ts', // HTTP client is a thin wrapper around axios, hard to test with mocks
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 80,
      functions: 80,
      statements: 80,
    },
  },
  coverageDirectory: 'coverage',
  verbose: true,
};