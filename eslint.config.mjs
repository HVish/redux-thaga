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
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: {
          // Typed linting for config files living outside tsconfig's `include`.
          allowDefaultProject: ['tsup.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Module-augmentation type parameters must match the augmented interface
    // verbatim; they're required by interface merging even when unreferenced.
    files: ['**/augmentation.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
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
