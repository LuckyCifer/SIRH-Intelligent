import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
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
      // Règle « React Compiler » (performance : rendus en cascade), pas une erreur de
      // logique. Elle signale le schéma volontaire « chargement des données dans un
      // useEffect » (setLoading(true) puis appel API) utilisé par les pages de liste.
      // Migration prévue : TanStack Query (déjà installé). Laissée visible en avertissement.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
