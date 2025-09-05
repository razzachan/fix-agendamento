import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,js}', 'test/**/*.ts'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Relax rules to fit current codebase and avoid churn; we can tighten incrementally
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-empty': 'off',
      'prefer-const': 'off',
      'prefer-rest-params': 'off',
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      // Keep console logs for observability in this service
      'no-console': 'off',
    },
  }
);

