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
    // Reuse the jsdom environment across test files instead of spinning up
    // a fresh one per file — that 17-file suite was creating jsdom 17 times
    // and spending ~66% of total run time on environment setup alone.
    //
    // NOT isolate: false — that also shares the module registry across
    // files in a worker, which breaks when two files vi.mock() the same
    // module differently (e.g. ChatInterface.test.tsx and Sidebar.test.tsx
    // both mock UserSearch, but as different fake components). Whichever
    // file's mock registered last silently wins for every file in that
    // worker, which caused Sidebar's test to render ChatInterface's mock
    // instead of its own. vmThreads keeps per-file module isolation (each
    // file's mocks stay its own) while still reusing the environment.
    pool: 'vmThreads',
  },
})
