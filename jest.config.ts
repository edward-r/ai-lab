import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        useESM: false,
        diagnostics: { warnOnly: true },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@prompt-maker/core$': '<rootDir>/libs/prompt-maker-core/src/index.ts',
    '^@prompt-maker/core/(.*)$': '<rootDir>/libs/prompt-maker-core/src/$1',
    '^~prompt-maker/(.*)$': '<rootDir>/apps/prompt-maker-cli/src/$1',
    '^boxen$': '<rootDir>/tests/mocks/boxen.ts',
    '^chalk$': '<rootDir>/tests/mocks/chalk.ts',
    '^ora$': '<rootDir>/tests/mocks/ora.ts',
    '^yargs$': '<rootDir>/tests/mocks/yargs.ts',
    '^ink$': '<rootDir>/tests/mocks/ink.ts',
    '^ink-text-input$': '<rootDir>/tests/mocks/ink-text-input.tsx',
    '^ink-spinner$': '<rootDir>/tests/mocks/ink-spinner.tsx',
  },
  setupFilesAfterEnv: ['<rootDir>/apps/prompt-maker-cli/src/test-utils/setup.ts'],
  testMatch: [
    '<rootDir>/apps/**/src/__tests__/**/*.test.ts',
    '<rootDir>/libs/**/src/__tests__/**/*.test.ts',
  ],
  transformIgnorePatterns: ['/node_modules/(?!(yargs)/)'],
  modulePathIgnorePatterns: [
    '<rootDir>/dist',
    '<rootDir>/apps/prompt-maker-cli/dist',
    '<rootDir>/.nx/cache',
  ],
  resetMocks: true,
  restoreMocks: true,
  clearMocks: true,
}

export default config
