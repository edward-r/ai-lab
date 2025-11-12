import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  recommendedConfig: js.configs.recommended,
})

const reactHooks = await import('eslint-plugin-react-hooks')
const reactRefresh = await import('eslint-plugin-react-refresh')

export default [
  {
    ignores: ['**/dist', '**/.next', '**/.next/**'],
  },
  js.configs.recommended,
  ...compat.extends('plugin:@nx/typescript'),
  ...compat.extends('plugin:@nx/javascript'),
  ...compat.extends('plugin:@nx/react'),
  ...compat.extends('next'),
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      'react-hooks': reactHooks.default ?? reactHooks,
      'react-refresh': reactRefresh.default ?? reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
