import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default defineConfig([
  globalIgnores([
    'dist/**',
    'coverage/**',
    'integration-test/**',
    'node_modules/**',
  ]),
  {
    files: ['**/*.{js,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // TODO: tighten to 'error' and remove remaining `any`s in a follow-up PR
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: { globals: { ...globals.jest } },
    rules: {
      'require-yield': 'off',
    },
  },
]);
