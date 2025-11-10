module.exports = {
  root: true,
  extends: ['@nx/eslint/presets/react'],
  ignorePatterns: ['!**/*'],
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
      env: { browser: true, es2023: true },
      settings: { react: { version: 'detect' } },
      plugins: ['react-refresh', 'react-hooks'],
      rules: {
        'react-refresh/only-export-components': 'warn',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
  ],
};
