import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import {defineConfig} from 'eslint/config';

export default defineConfig([
    {files: ['frontend/**/*.{js,mjs,cjs,ts,jsx,tsx}'], plugins: {js}, extends: ['js/recommended']},
    {files: ['frontend/**/*.{js,mjs,cjs,ts,jsx,tsx}'], languageOptions: {globals: globals.browser}},
    {files: ['frontend/**/*.{js,mjs,cjs,ts,jsx,tsx}'], extends: [tseslint.configs.recommended]},
    pluginReact.configs.flat.recommended,
    pluginReact.configs.flat['jsx-runtime'],
    pluginReactHooks.configs['recommended-latest'],
    {
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
]);
