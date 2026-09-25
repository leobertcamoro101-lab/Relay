/**
 * Sidebar-drawer.test.tsx
 *
 * Additive to tests/components/Sidebar.test.tsx, which already covers room
 * switching, conversation delete, click-outside, and starting DMs. This file
 * only adds what that one doesn't:
 *   - backdrop presence tied to `isOpen`, and that it calls `onClose`
 *   - the empty-conversations state
 *   - an axe accessibility scan
 *
 * Deliberately NOT covered here:
 *   - "backdrop only shows below md" — that's Tailwind's `md:hidden`, a pure
 *     CSS media query. jsdom doesn't evaluate media queries, so this isn't
 *     unit-testable; it's what the Playwright visual-regression spec is for.
 *   - focus trapping / returning focus on close / aria-hidden / role="dialog"
 *     — the component doesn't implement any of these. Flagging as a real
 *     gap rather than writing tests against behavior that isn't there:
 *     worth adding if the drawer is meant to be a proper modal on mobile.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

vi.mock("../../src/pages/authenticated/AccountMenu", () => ({
  default: () => <div data-testid="account-menu" />,
}));
vi.mock("../../src/pages/authenticated/UserSearch", () => ({
  default: ({ onSelectUser }: { onSelectUser: (id: string) => void }) => (
    <button onClick={() => onSelectUser("searched-user-id")}>mock-user-search</button>
  ),
}));

const { default: Sidebar } = await import("../../src/pages/authenticated/Sidebar");
import type { ConversationSummary, User as RelayUser } from "../../src/types";

const conversations: ConversationSummary[] = [
  { roomId: "dm_a_b", otherUser: { id: "b", firstName: "Bea", lastName: "Bob", image: "" } },
];

const onlineUsers: RelayUser[] = [{ id: "me", username: "Alice" }];

function renderSidebar(overrides: Partial<ComponentProps<typeof Sidebar>> = {}) {
  const props = {
    currentRoom: "general",
    onlineCount: 1,
    users: onlineUsers,
    onSwitchRoom: vi.fn(),
    currentUser: { id: "me", username: "Alice" },
    isOpen: true,
    onClose: vi.fn(),
    conversations,
    onStartConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    ...overrides,
  };
  const utils = render(<Sidebar {...props} />);
  return { ...utils, props };
}

describe("Sidebar backdrop", () => {
  it("renders no backdrop when isOpen is false", () => {
    const { container } = renderSidebar({ isOpen: false });
    expect(container.querySelector(".bg-black\\/50")).not.toBeInTheDocument();
  });

  it("renders a backdrop when isOpen is true", () => {
    const { container } = renderSidebar({ isOpen: true });
    expect(container.querySelector(".bg-black\\/50")).toBeInTheDocument();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const { container, props } = renderSidebar({ isOpen: true });
    const user = userEvent.setup();

    await user.click(container.querySelector(".bg-black\\/50") as Element);

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the mobile close (X) button is clicked", async () => {
    const { props } = renderSidebar({ isOpen: true });
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Close menu"));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Empty conversations state", () => {
  it("shows the search-or-click hint when there are no conversations", () => {
    renderSidebar({ conversations: [] });
    expect(
      screen.getByText("Search above, or click an online user below, to start a DM.")
    ).toBeInTheDocument();
  });

  it("does not show the hint when conversations exist", () => {
    renderSidebar();
    expect(
      screen.queryByText("Search above, or click an online user below, to start a DM.")
    ).not.toBeInTheDocument();
  });
});

describe("Accessibility", () => {
  it("has no detectable axe violations", async () => {
    const { container } = renderSidebar();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
