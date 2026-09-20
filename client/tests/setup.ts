import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't implement scrollIntoView (it has no real layout engine) —
// MessageList.tsx calls it on every render to auto-scroll to the newest
// message, so without this stub every test that renders it throws.
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}

// Unmount whatever the previous test rendered so tests never leak DOM
// nodes or event listeners into each other.
afterEach(() => {
  cleanup();
});
