import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'functions', 'ios']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // The newer react-hooks (React Compiler) correctness rules flag real
      // patterns worth fixing, but the existing UI code predates them. Keep them
      // visible as warnings so CI can gate on errors without forcing risky,
      // untested refactors of working logic. Address these incrementally.
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    // Root-level scripts (seed/maintenance + config) run under Node, not the browser.
    files: ['*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
