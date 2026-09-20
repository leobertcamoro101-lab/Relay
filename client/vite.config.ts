/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// `defineConfig` is imported from `vite`, not `vitest/config`, on purpose:
// `vitest/config` re-exports its own `UserConfig` sourced from whatever
// copy of Vite ends up nested under vitest's node_modules, which on a
// clean `npm ci` (e.g. on Vercel) can resolve to a different — even a
// "rolldown" flavored — Vite than the top-level one @vitejs/plugin-react
// is built against. That mismatch fails `tsc -b` with a `Plugin`/`PluginOption`
// type conflict, even though the dev/test scripts (which don't type-check
// this file) run fine either way.
//
// The triple-slash reference below is Vitest's documented fix: it adds the
// `test` key to Vite's own `UserConfig` via declaration merging, without
// swapping which package's types `defineConfig`/`plugins` resolve against.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  esbuild: { jsx: 'automatic' }
})
