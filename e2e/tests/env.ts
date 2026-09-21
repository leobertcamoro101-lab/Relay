// Single source of truth for the ports/URLs the E2E suite talks to, so
// playwright.config.ts (which boots the servers) and the spec files
// (which talk to them) can never drift apart.
export const CLIENT_PORT = 5173;
export const SERVER_PORT = 8080;

export const BASE_URL = `http://localhost:${CLIENT_PORT}`;
export const API_URL = `http://localhost:${SERVER_PORT}/api`;
export const WS_URL = `ws://localhost:${SERVER_PORT}`;
