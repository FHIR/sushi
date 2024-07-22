import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  {
    ignores: [
      'dist/*',
      'coverage/*',
      'build*/*',
      '**/*.d.ts',
      'src/public/',
      'src/types/',
      'regression/output*',
      '**/generated'
    ]
  },
  ...compat.extends('plugin:@typescript-eslint/recommended', 'prettier'),
  {
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2018,
      sourceType: 'module'
    },

    rules: {
      semi: ['error', 'always'],

      quotes: [
        'error',
        'single',
        {
          avoidEscape: true
        }
      ],

      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off'
    }
  }
];
