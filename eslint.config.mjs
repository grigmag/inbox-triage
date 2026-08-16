import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const dashboardFiles = ['apps/dashboard/**/*.{js,jsx,ts,tsx}'];
const reactFiles = ['apps/**/*.{jsx,tsx}', 'packages/**/*.{jsx,tsx}'];

export default defineConfig([
  globalIgnores(
    [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/coverage/**',
      '**/next-env.d.ts',
    ],
    'global/ignores',
  ),
  {
    name: 'javascript/recommended',
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
  },
  {
    name: 'typescript/recommended',
    files: ['**/*.{ts,tsx}'],
    ignores: dashboardFiles,
    extends: [tseslint.configs.recommended],
  },
  {
    name: 'react/hooks-and-a11y',
    files: reactFiles,
    ignores: dashboardFiles,
    extends: [
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
  },
  {
    name: 'next/core-web-vitals',
    files: dashboardFiles,
    extends: [nextVitals, nextTs],
    settings: {
      next: {
        rootDir: 'apps/dashboard',
      },
    },
  },
  eslintConfigPrettier,
]);
