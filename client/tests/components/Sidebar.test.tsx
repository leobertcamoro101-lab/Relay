import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

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
  { roomId: "dm_a_c", otherUser: null },
];

const onlineUsers: RelayUser[] = [
  { id: "me", username: "Alice" },
  { id: "other", username: "Bea" },
];

function renderSidebar(overrides: Partial<ComponentProps<typeof Sidebar>> = {}) {
  const props = {
    currentRoom: "general",
    onlineCount: 2,
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
  render(<Sidebar {...props} />);
  return props;
}

describe("Sidebar", () => {
  it("switches rooms when a different room is clicked", async () => {
    const props = renderSidebar({ currentRoom: "general" });
    const user = userEvent.setup();

    await user.click(screen.getByText("# tech"));
    expect(props.onSwitchRoom).toHaveBeenCalledWith("tech");
  });

  it("renders each conversation's label, falling back to 'Unknown user'", () => {
    renderSidebar();
    expect(screen.getByText("Bea Bob")).toBeInTheDocument();
    expect(screen.getByText("Unknown user")).toBeInTheDocument();
  });

  it("opens the options menu and deletes a conversation", async () => {
    const props = renderSidebar();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Options for Bea Bob"));
    const deleteButton = await screen.findByText("Delete");
    await user.click(deleteButton);

    expect(props.onDeleteConversation).toHaveBeenCalledWith("dm_a_b");
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("closes the options menu when clicking outside of it", async () => {
    renderSidebar();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Options for Bea Bob"));
    expect(screen.getByText("Delete")).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("starts a conversation by clicking an online user, but not yourself", async () => {
    const props = renderSidebar();
    const user = userEvent.setup();

    await user.click(screen.getByText("Bea"));
    expect(props.onStartConversation).toHaveBeenCalledWith("other");

    props.onStartConversation.mockClear();
    await user.click(screen.getByText("Alice (you)"));
    expect(props.onStartConversation).not.toHaveBeenCalled();
  });

  it("starts a conversation via the search box", async () => {
    const props = renderSidebar();
    const user = userEvent.setup();

    await user.click(screen.getByText("mock-user-search"));
    expect(props.onStartConversation).toHaveBeenCalledWith("searched-user-id");
  });
});
