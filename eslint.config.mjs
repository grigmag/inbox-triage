import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const dashboardFiles = ['apps/dashboard/**/*.{js,jsx,ts,tsx}'];
const reactFiles = ['apps/**/*.{jsx,tsx}', 'packages/**/*.{jsx,tsx}'];
const dashboardComponentFiles = ['apps/dashboard/src/**/*.tsx'];
const dashboardTestFiles = ['apps/dashboard/src/**/*.test.tsx'];

/** An export of a PascalCase function or const, which is how components are named. */
const exportedComponent =
  'ExportNamedDeclaration:matches(' +
  ':has(> FunctionDeclaration[id.name=/^[A-Z]/]), ' +
  ':has(VariableDeclarator[id.name=/^[A-Z][a-z]/]))';

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
  {
    name: 'dashboard/no-direct-clerk',
    files: dashboardFiles,
    ignores: ['apps/dashboard/src/proxy.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@clerk/nextjs',
              message:
                'Import auth UI from @inbox-triage/auth/client instead of @clerk/nextjs.',
            },
            {
              name: '@clerk/nextjs/server',
              message:
                'Use requireUser() from the dashboard auth module instead of importing @clerk/nextjs/server.',
            },
          ],
          patterns: [
            {
              regex: '^@clerk/',
              message:
                'Import authentication through @inbox-triage/auth or the dashboard auth module.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'dashboard/only-export-components',
    files: dashboardComponentFiles,
    ignores: dashboardTestFiles,
    extends: [reactRefresh.configs.next()],
  },
  {
    name: 'dashboard/one-component-per-file',
    files: dashboardComponentFiles,
    ignores: dashboardTestFiles,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `${exportedComponent} ~ ${exportedComponent}`,
          message:
            'Export one component per file. Keep sub-components that only this file uses unexported.',
        },
      ],
    },
  },
  eslintConfigPrettier,
  {
    name: 'react/jsx-newline',
    files: reactFiles,
    plugins: {
      react,
    },
    rules: {
      'react/jsx-newline': ['error', { prevent: false }],
    },
  },
]);
