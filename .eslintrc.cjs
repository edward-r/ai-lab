module.exports = {
  root: true,
  parserOptions: { ecmaVersion: 2023, sourceType: 'module' },
  env: { browser: true, es2023: true },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh', 'react-hooks'],
  extends: ['eslint:recommended'],
  rules: {
    'react-refresh/only-export-components': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  },
  ignorePatterns: ['dist', 'node_modules']
};
