import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist', 'data', 'drizzle', 'src/client/routeTree.gen.ts']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    files: ['src/server/**/*.ts', '*.config.ts', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/client/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
  {
    // Route files export a Route object next to private components. The router
    // plugin splits them apart and handles hot reloading itself.
    files: ['src/client/routes/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
);
