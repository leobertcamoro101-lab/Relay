# Relay E2E tests (Playwright)

End-to-end tests that drive the real client in a real browser against a
real server — no mocks. Covers signup/login/forgot-password/reset-password
and the core chat flows (sending messages, direct messages, editing and
deleting messages, deleting a conversation).

## How it fits together

`playwright.config.ts` starts both halves of the app itself before any
test runs:

- the server (`server/tests/e2e-server.ts`), backed by an in-memory
  MongoDB via `mongodb-memory-server` — the same approach the server's own
  vitest suite uses, just kept running for the whole E2E run instead of
  per test file;
- the client (`vite`, the real dev server), pointed at that server via
  `VITE_BACKEND_URL`/`VITE_WS_URL` env vars passed straight into the
  process — this works even in CI, where `client/.env` doesn't exist
  (it's gitignored).

Tests that don't specifically test signup/login skip that UI and
provision a user directly through the signup API instead (see
`tests/fixtures.ts`) — faster, and keeps each test focused on the one
thing it's actually checking.

## Running locally

```bash
cd e2e
npm install
npx playwright install chromium   # one-time, downloads a browser
npm test                          # headless
npm run test:ui                   # Playwright's interactive UI mode
npm run report                    # open the last HTML report
```

You don't need the client or server running yourself — Playwright starts
and stops both around the run. If you already have them running on ports
5173/8080, it reuses those instead (`reuseExistingServer` is on outside CI).

## In CI

Runs as its own `e2e-tests` job in `.github/workflows/tests.yml`, in
parallel with the unit test jobs. It's currently marked
`continue-on-error: true` and isn't in `deploy`'s `needs` list, so a
failure here is visible (check the job, or the uploaded
`playwright-report` artifact) but doesn't block a deploy or fail the
overall workflow. Once it's been stable for a while, drop
`continue-on-error` and add `e2e-tests` to `deploy`'s `needs` to make it a
real gate like the server/client test jobs.

## A note on test selectors

The app doesn't currently have `data-testid` attributes, so these tests
locate elements by visible text, placeholder, ARIA role/label, and a
couple of structural CSS-class hooks (`div.group`, used for both message
bubbles and sidebar conversation rows to find their hover-only "⋮" menus).
That's standard practice but does mean a form-copy or class-name change
that isn't purely cosmetic can break a test that has nothing to do with
that copy. If that starts happening often, adding a few `data-testid`s to
the interactive elements these tests drive (message bubbles, menu
buttons, conversation rows) would make them more resilient.
