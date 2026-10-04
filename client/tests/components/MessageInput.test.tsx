import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageInput from "../../src/pages/authenticated/MessageInput";

function renderInput(overrides: Partial<{ onSend: ReturnType<typeof vi.fn>; onTyping: ReturnType<typeof vi.fn> }> = {}) {
  const onSend = overrides.onSend ?? vi.fn();
  const onTyping = overrides.onTyping ?? vi.fn();
  render(<MessageInput onSend={onSend} onTyping={onTyping} />);
  return { onSend, onTyping };
}

describe("Submitting a message", () => {
  it("calls onSend with trimmed text and clears the input on Enter", async () => {
    const { onSend } = renderInput();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Type a message...");

    await user.type(input, "  hello there  {Enter}");

    expect(onSend).toHaveBeenCalledWith("hello there");
    expect(input).toHaveValue("");
  });

  it("does not submit on Shift+Enter", async () => {
    const { onSend } = renderInput();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Type a message...");

    await user.type(input, "still typing");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue("still typing");
  });

  it("does not submit empty or whitespace-only text", async () => {
    const { onSend } = renderInput();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Type a message...");

    await user.type(input, "   {Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("submits via the Send button and disables it when the field is empty", async () => {
    const { onSend } = renderInput();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Type a message...");
    const button = screen.getByRole("button", { name: "Send" });

    expect(button).toBeDisabled();

    await user.type(input, "via button");
    expect(button).not.toBeDisabled();

    await user.click(button);
    expect(onSend).toHaveBeenCalledWith("via button");
    expect(input).toHaveValue("");
  });
});

describe("Typing indicator", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onTyping(true) on the first keystroke, not on every keystroke", async () => {
    const { onTyping } = renderInput();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const input = screen.getByPlaceholderText("Type a message...");

    await user.type(input, "ab");

    const trueCalls = onTyping.mock.calls.filter(([v]) => v === true);
    expect(trueCalls).toHaveLength(1);
  });

  it("fires onTyping(false) after 1500ms of no further typing", async () => {
    const { onTyping } = renderInput();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const input = screen.getByPlaceholderText("Type a message...");

    await user.type(input, "a");
    expect(onTyping).toHaveBeenLastCalledWith(true);

    vi.advanceTimersByTime(1500);

    expect(onTyping).toHaveBeenLastCalledWith(false);
  });

  it("resets the 1500ms timer on each keystroke instead of firing early", async () => {
    const { onTyping } = renderInput();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const input = screen.getByPlaceholderText("Type a message...");

    await user.type(input, "a");
    vi.advanceTimersByTime(1000);
    await user.type(input, "b"); // resets the timer before it would have fired
    vi.advanceTimersByTime(1000); // 1000ms since "b" — still under the 1500ms threshold

    expect(onTyping).not.toHaveBeenCalledWith(false);

    vi.advanceTimersByTime(500); // now 1500ms since "b"
    expect(onTyping).toHaveBeenLastCalledWith(false);
  });

  it("stops the typing indicator immediately on submit, cancelling the pending timeout", async () => {
    const { onTyping } = renderInput();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const input = screen.getByPlaceholderText("Type a message...");

    await user.type(input, "hi{Enter}");

    expect(onTyping).toHaveBeenLastCalledWith(false);
    const falseCallCountAtSubmit = onTyping.mock.calls.filter(([v]) => v === false).length;

    // If the 1500ms timeout wasn't cleared on submit, this would fire a
    // second onTyping(false) — same value, so toHaveBeenLastCalledWith
    // wouldn't catch a duplicate. Assert the call count directly instead.
    vi.advanceTimersByTime(2000);
    const falseCallCountAfter = onTyping.mock.calls.filter(([v]) => v === false).length;
    expect(falseCallCountAfter).toBe(falseCallCountAtSubmit);
  });
});
