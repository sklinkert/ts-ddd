/** @type {import('jest').Config} */
const base = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
};

/** @type {import('jest').Config} */
module.exports = {
  testTimeout: 120000,
  projects: [
    {
      ...base,
      displayName: 'unit',
      rootDir: __dirname,
      testMatch: ['<rootDir>/test/unit/**/*.spec.ts', '<rootDir>/src/**/*.spec.ts'],
      moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
      },
    },
    {
      ...base,
      displayName: 'integration',
      rootDir: __dirname,
      testMatch: ['<rootDir>/test/integration/**/*.e2e-spec.ts'],
      globalSetup: '<rootDir>/test/integration/setup/jest-global-setup.ts',
      globalTeardown: '<rootDir>/test/integration/setup/jest-global-teardown.ts',
      moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
      },
    },
  ],
};
