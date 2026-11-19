import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReactionBar from "../../src/pages/authenticated/ReactionBar";
import ReactionPicker from "../../src/pages/authenticated/ReactionPicker";
import MessageList from "../../src/pages/authenticated/MessageList";
import type { ChatMessage } from "../../src/types";

// MessageList pulls in hooks that need app providers; these tests are about
// reactions only, so stub them (same approach as the attachment-edit tests).
vi.mock("../../src/hooks/useFileUpload", () => ({
  useFileUpload: () => ({ uploadFile: vi.fn(), isUploading: false, uploadError: undefined }),
}));

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("ReactionBar", () => {
  it("renders nothing when there are no reactions", () => {
    const { container } = render(<ReactionBar reactions={{}} currentUserId="u1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows each emoji with its count and skips empty ones", () => {
    render(<ReactionBar reactions={{ "👍": ["a", "b"], "❤️": [] }} currentUserId="u1" onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "👍 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /❤️/ })).not.toBeInTheDocument();
  });

  it("marks reactions you made as pressed and toggles on click", async () => {
    const onToggle = vi.fn();
    render(<ReactionBar reactions={{ "👍": ["u1"], "😂": ["b"] }} currentUserId="u1" onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "👍 1, you reacted" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "😂 1" })).toHaveAttribute("aria-pressed", "false");

    await userEvent.setup().click(screen.getByRole("button", { name: "😂 1" }));
    expect(onToggle).toHaveBeenCalledWith("😂");
  });
});

describe("ReactionPicker", () => {
  it("opens, lists the emoji, calls onPick and closes", async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<ReactionPicker onPick={onPick} />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add reaction" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "React with 🎉" }));
    expect(onPick).toHaveBeenCalledWith("🎉");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ReactionPicker onPick={vi.fn()} />
        <button>elsewhere</button>
      </div>
    );
    await user.click(screen.getByRole("button", { name: "Add reaction" }));
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("MessageList reactions", () => {
  const messages: ChatMessage[] = [
    { type: "MESSAGE", id: "m1", userId: "other", username: "Alan", text: "hi", timestamp: 1, reactions: { "👍": ["me"] } },
    { type: "MESSAGE", id: "m2", userId: "me", username: "Me", text: "mine", timestamp: 2 },
  ];

  function setup(onToggleReaction?: (id: string, emoji: string) => void) {
    render(
      <MessageList
        messages={messages}
        currentUser={{ id: "me", username: "Me" }}
        typingUsers={[]}
        onEditMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
        onToggleReaction={onToggleReaction}
      />
    );
    return userEvent.setup();
  }

  it("shows existing reactions on a message", () => {
    setup(vi.fn());
    expect(screen.getByRole("button", { name: "👍 1, you reacted" })).toBeInTheDocument();
  });

  it("lets you react to someone else's and to your own message", async () => {
    const onToggle = vi.fn();
    const user = setup(onToggle);

    const pickers = screen.getAllByRole("button", { name: "Add reaction" });
    expect(pickers).toHaveLength(2);

    await user.click(pickers[0]);
    await user.click(screen.getByRole("menuitem", { name: "React with 😂" }));
    expect(onToggle).toHaveBeenCalledWith("m1", "😂");
  });

  it("clicking a chip toggles that reaction", async () => {
    const onToggle = vi.fn();
    const user = setup(onToggle);
    await user.click(screen.getByRole("button", { name: "👍 1, you reacted" }));
    expect(onToggle).toHaveBeenCalledWith("m1", "👍");
  });

  it("hides the picker when no handler is provided", () => {
    setup(undefined);
    expect(screen.queryByRole("button", { name: "Add reaction" })).not.toBeInTheDocument();
  });
});
