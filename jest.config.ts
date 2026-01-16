import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  clearMocks: true,
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@lib-supabase/(.*)$': '<rootDir>/src/lib/supabase/$1',
    '^@actions/(.*)$': '<rootDir>/src/lib/actions/$1',
    '^@auth/(.*)$': '<rootDir>/src/lib/auth/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@constants/(.*)$': '<rootDir>/src/lib/constants/$1',
    '^@helpers/(.*)$': '<rootDir>/src/lib/helpers/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@lib-types/(.*)$': '<rootDir>/src/lib/types/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@proxy/(.*)$': '<rootDir>/src/lib/proxy/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@utils/(.*)$': '<rootDir>/src/lib/utils/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
};

export default createJestConfig(config);
