import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Share the jsdom environment and module registry across test files in
    // the same worker instead of spinning up a fresh one per file — that
    // 17-file suite was creating jsdom 17 times and spending ~66% of total
    // run time on environment setup alone. Test files here are small and
    // don't mutate shared globals, so losing full per-file isolation is a
    // safe trade for the speedup.
    isolate: false,
  },
})
