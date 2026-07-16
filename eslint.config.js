// Flat ESLint config (ESLint 9 + eslint-config-expo). Replaces .eslintrc.js.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.expo/',
      'coverage/',
      'assets/',
      'babel.config.js',
      'jest.setup.js',
      'eslint.config.js',
    ],
  },
  {
    rules: {
      // tsc validates module resolution, and the `@/` alias comes from
      // babel-plugin-module-resolver - which the import plugin can't resolve.
      'import/no-unresolved': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
