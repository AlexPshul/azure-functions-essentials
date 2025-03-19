import pluginJs from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // First explicitly set which directories to ignore completely
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '**/*.js', '**/*.mjs', '**/*.cjs'],
  },
  // Then set rules for TypeScript files
  {
    files: ['**/*.ts'],
  },
];
