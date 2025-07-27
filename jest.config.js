/** @type {import('jest').Config} */
module.exports = {
  // Test Environment
  testEnvironment: 'node',
  preset: 'ts-jest',
  
  // Coverage Configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'apps/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
    '!**/*.config.{ts,js}',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Financial calculations require 100% coverage
    './src/lib/utils/precision.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/lib/utils/currency.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },

  // Test File Patterns
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  
  // Module Resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@apps/(.*)$': '<rootDir>/apps/$1',
    '^@packages/(.*)$': '<rootDir>/packages/$1'
  },

  // Setup Files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Test Timeout
  testTimeout: 30000,
  
  // Globals
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: 'tsconfig.json'
    }
  },

  // Transform Configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  
  // Module File Extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Verbose Output
  verbose: true,
  
  // Test Projects for Different Components
  projects: [
    {
      displayName: 'Frontend',
      testMatch: ['<rootDir>/src/**/*.(test|spec).(ts|tsx)'],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'Backend',
      testMatch: ['<rootDir>/apps/backend/**/*.(test|spec).(ts|js)'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Integration',
      testMatch: ['<rootDir>/tests/integration/**/*.(test|spec).(ts|js)'],
      testEnvironment: 'node',
      testTimeout: 60000
    }
  ]
};