import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageList from "../../src/pages/authenticated/MessageList";
import type { ChatMessage, User } from "../../src/types";

const currentUser: User = { id: "me", username: "Alice" };

const baseMessages: ChatMessage[] = [
  { type: "MESSAGE", id: "msg-1", userId: "me", username: "Alice", text: "hi there", timestamp: Date.now() },
  { type: "MESSAGE", id: "msg-2", userId: "other", username: "Bea", text: "hey!", timestamp: Date.now() },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MessageList", () => {
  it("shows the sender's name only on other people's messages", () => {
    render(
      <MessageList
        messages={baseMessages}
        currentUser={currentUser}
        typingUsers={[]}
        onEditMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
      />,
    );

    expect(screen.getByText("Bea")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("hi there")).toBeInTheDocument();
    expect(screen.getByText("hey!")).toBeInTheDocument();
  });

  it("renders SYSTEM messages as centered announcements, not chat bubbles", () => {
    render(
      <MessageList
        messages={[{ type: "SYSTEM", text: "Alice joined the room" }]}
        currentUser={currentUser}
        typingUsers={[]}
        onEditMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
      />,
    );

    expect(screen.getByText("Alice joined the room")).toBeInTheDocument();
  });

  it("shows a typing indicator listing who is typing", () => {
    render(
      <MessageList
        messages={[]}
        currentUser={currentUser}
        typingUsers={[{ userId: "other", username: "Bea" }]}
        onEditMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
      />,
    );

    expect(screen.getByText(/Bea typing/)).toBeInTheDocument();
  });

  it("only shows the options (⋮) button on your own messages", () => {
    render(
      <MessageList
        messages={baseMessages}
        currentUser={currentUser}
        typingUsers={[]}
        onEditMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
      />,
    );

    // Only msg-1 (mine) has an options button.
    expect(screen.getAllByLabelText("Message options")).toHaveLength(1);
  });

  it("edits a message: opens the menu, edits inline, saves on Enter", async () => {
    const onEditMessage = vi.fn();
    const user = userEvent.setup();
    render(
      <MessageList
        messages={baseMessages}
        currentUser={currentUser}
        typingUsers={[]}
        onEditMessage={onEditMessage}
        onDeleteMessage={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Message options"));
    await user.click(screen.getByText("Edit"));

    const input = screen.getByDisplayValue("hi there");
    await user.clear(input);
    await user.type(input, "hi there, edited{Enter}");

    expect(onEditMessage).toHaveBeenCalledWith("msg-1", "hi there, edited");
  });

  it("deletes a message only after confirming", async () => {
    const onDeleteMessage = vi.fn();
    const user = userEvent.setup();
    vi.stubGlobal("confirm", () => true);
    render(
      <MessageList
        messages={baseMessages}
        currentUser={currentUser}
        typingUsers={[]}
        onEditMessage={vi.fn()}
        onDeleteMessage={onDeleteMessage}
      />,
    );

    await user.click(screen.getByLabelText("Message options"));
    await user.click(screen.getByText("Delete"));

    expect(onDeleteMessage).toHaveBeenCalledWith("msg-1");
  });

  it("does not delete when the confirmation is declined", async () => {
    const onDeleteMessage = vi.fn();
    const user = userEvent.setup();
    vi.stubGlobal("confirm", () => false);
    render(
      <MessageList
        messages={baseMessages}
        currentUser={currentUser}
        typingUsers={[]}
        onEditMessage={vi.fn()}
        onDeleteMessage={onDeleteMessage}
      />,
    );

    await user.click(screen.getByLabelText("Message options"));
    await user.click(screen.getByText("Delete"));

    expect(onDeleteMessage).not.toHaveBeenCalled();
  });

  it("closes the options menu when clicking outside of it", async () => {
    const user = userEvent.setup();
    render(
      <MessageList
        messages={baseMessages}
        currentUser={currentUser}
        typingUsers={[]}
        onEditMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Message options"));
    expect(screen.getByText("Edit")).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });
});
