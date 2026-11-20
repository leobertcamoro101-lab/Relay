import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageInput from "../../src/pages/authenticated/MessageInput";
import MessageList from "../../src/pages/authenticated/MessageList";
import ReplyQuote from "../../src/pages/authenticated/ReplyQuote";
import type { ChatMessage, ReplyPreview } from "../../src/types";

vi.mock("../../src/hooks/useFileUpload", () => ({
  useFileUpload: () => ({ uploadFile: vi.fn(), isUploading: false, uploadError: undefined }),
}));

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const target: ReplyPreview = { id: "m1", username: "Alan", text: "lunch at noon?" };

describe("MessageInput reply banner", () => {
  it("shows who you are replying to and can be cancelled", async () => {
    const onCancelReply = vi.fn();
    render(<MessageInput onSend={vi.fn()} onTyping={vi.fn()} replyingTo={target} onCancelReply={onCancelReply} />);

    expect(screen.getByText("Replying to Alan")).toBeInTheDocument();
    expect(screen.getByText("lunch at noon?")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Cancel reply" }));
    expect(onCancelReply).toHaveBeenCalledTimes(1);
  });

  it("sends the reply target id as the third argument, then clears the reply", async () => {
    const onSend = vi.fn();
    const onCancelReply = vi.fn();
    render(<MessageInput onSend={onSend} onTyping={vi.fn()} replyingTo={target} onCancelReply={onCancelReply} />);

    await userEvent.setup().type(screen.getByPlaceholderText("Type a message..."), "sure{Enter}");

    expect(onSend).toHaveBeenCalledWith("sure", undefined, "m1");
    expect(onCancelReply).toHaveBeenCalled();
  });

  it("Escape cancels the reply", async () => {
    const onCancelReply = vi.fn();
    render(<MessageInput onSend={vi.fn()} onTyping={vi.fn()} replyingTo={target} onCancelReply={onCancelReply} />);

    const input = screen.getByPlaceholderText("Type a message...");
    await userEvent.setup().type(input, "{Escape}");
    expect(onCancelReply).toHaveBeenCalled();
  });

  it("keeps the plain two-argument call when not replying", async () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} onTyping={vi.fn()} />);
    await userEvent.setup().type(screen.getByPlaceholderText("Type a message..."), "hi{Enter}");
    expect(onSend).toHaveBeenCalledWith("hi", undefined);
  });
});

describe("ReplyQuote", () => {
  it("shows the attachment name when the quoted message had no text", () => {
    render(<ReplyQuote reply={{ id: "x", username: "Ann", text: "", attachmentName: "cat.png" }} isMine={false} />);
    expect(screen.getByText("cat.png")).toBeInTheDocument();
  });

  it("calls onJump with the original id", async () => {
    const onJump = vi.fn();
    render(<ReplyQuote reply={target} isMine={false} onJump={onJump} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Jump to original message/ }));
    expect(onJump).toHaveBeenCalledWith("m1");
  });
});

describe("MessageList replies", () => {
  const messages: ChatMessage[] = [
    { type: "MESSAGE", id: "m1", userId: "other", username: "Alan", text: "lunch at noon?", timestamp: 1 },
    { type: "MESSAGE", id: "m2", userId: "me", username: "Me", text: "sure", timestamp: 2, replyTo: target },
  ];

  function setup(onReply?: (m: ChatMessage) => void) {
    render(
      <MessageList
        messages={messages}
        currentUser={{ id: "me", username: "Me" }}
        typingUsers={[]}
        onEditMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
        onReply={onReply}
      />
    );
    return userEvent.setup();
  }

  it("renders the quoted preview inside the reply bubble", () => {
    setup();
    expect(screen.getByRole("button", { name: /Replying to Alan/ })).toBeInTheDocument();
  });

  it("clicking Reply passes that message up", async () => {
    const onReply = vi.fn();
    const user = setup(onReply);
    const buttons = screen.getAllByRole("button", { name: "Reply" });
    expect(buttons).toHaveLength(2); // one per message
    await user.click(buttons[0]);
    expect(onReply).toHaveBeenCalledWith(expect.objectContaining({ id: "m1", username: "Alan" }));
  });

  it("hides Reply buttons when onReply is not provided", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
  });

  it("clicking the quote scrolls to the original message", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: /Replying to Alan/ }));
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "center" })
    );
    expect(document.getElementById("msg-m1")).not.toBeNull();
  });

  it("does nothing when the original is not in the list", async () => {
    render(
      <MessageList
        messages={[{ ...messages[1], replyTo: { id: "gone", username: "Zed", text: "deleted" } }]}
        currentUser={{ id: "me", username: "Me" }}
        typingUsers={[]}
        onEditMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
      />
    );
    (window.HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
    await userEvent.setup().click(screen.getByRole("button", { name: /Replying to Zed/ }));
    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
