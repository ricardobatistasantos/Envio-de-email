/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */

const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

const config = {
  rootDir: compilerOptions.baseUrl,
  roots: ['<rootDir>/tests',],

  testEnvironment: 'node',

  clearMocks: true,

  collectCoverage: false,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageProvider: 'v8',
  coverageReporters: ['html', 'text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/**/*.module.ts',
    '!<rootDir>/src/**/*.interface.ts',
    '!<rootDir>/src/utils/*.ts',
    '!<rootDir>/src/presentation/**/*.ts',
    '!<rootDir>/src/infra/**/*.ts',
  ],

  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),

  preset: 'ts-jest',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  verbose: true,

  moduleFileExtensions: ['js', 'json', 'ts'],

  testRegex: '.*\\.spec\\.ts$',

  setupFiles: ['tsconfig-paths/register'],
};

module.exports = config;
