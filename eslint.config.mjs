import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// Flat-config port of the previous .eslintrc.json. The extends list and the
// three rule overrides are carried over unchanged — this migration exists to
// get off the EOL eslint@8 (and its brace-expansion advisory), not to change
// what gets reported.
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends(
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended'
  ),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
];

export default eslintConfig;
