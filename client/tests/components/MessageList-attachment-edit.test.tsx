import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import MessageList from "../../src/pages/authenticated/MessageList";
import type { ChatMessage } from "../../src/types";

// Minimal stand-in for the real hook: same surface MessageList relies on.
vi.mock("../../src/hooks/useMessageEditing", () => ({
  useMessageEditing: () => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    return {
      editingId,
      editText,
      setEditText,
      startEdit: (m: ChatMessage) => {
        setEditingId(m.id ?? null);
        setEditText(m.text ?? "");
      },
      cancelEdit: () => setEditingId(null),
      saveEdit: vi.fn(),
    };
  },
}));

const uploadFile = vi.fn();
vi.mock("../../src/hooks/useFileUpload", () => ({
  useFileUpload: () => ({ uploadFile, isUploading: false, uploadError: undefined }),
}));

const attachment = { url: "https://cdn/x.pdf", name: "report.pdf", type: "application/pdf", size: 2048 };

function setup(msg: Partial<ChatMessage> = {}) {
  const onEditMessage = vi.fn();
  const message = {
    id: "m1",
    userId: "u1",
    username: "me",
    text: "see attached",
    timestamp: Date.now(),
    attachment,
    ...msg,
  } as ChatMessage;
  render(
    <MessageList
      messages={[message]}
      currentUser={{ id: "u1", username: "me" }}
      typingUsers={[]}
      onEditMessage={onEditMessage}
      onDeleteMessage={vi.fn()}
    />
  );
  return { onEditMessage, user: userEvent.setup() };
}

async function openEdit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Message options" }));
  await user.click(screen.getByTitle("Edit message"));
}

beforeEach(() => {
  uploadFile.mockReset();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("Editing an attachment", () => {
  it("removes the attachment (sends null) and keeps the text", async () => {
    const { onEditMessage, user } = setup();
    await openEdit(user);
    await user.click(screen.getByRole("button", { name: "Remove file" }));
    await user.click(screen.getByTitle("Save"));
    expect(onEditMessage).toHaveBeenCalledWith("m1", "see attached", null);
  });

  it("undo cancels a pending removal", async () => {
    const { onEditMessage, user } = setup();
    await openEdit(user);
    await user.click(screen.getByRole("button", { name: "Remove file" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await user.click(screen.getByTitle("Save"));
    expect(onEditMessage).not.toHaveBeenCalled(); // nothing changed
  });

  it("replaces the attachment: uploads first, then sends the new one", async () => {
    const replacement = { url: "https://cdn/new.png", name: "new.png", type: "image/png", size: 10 };
    uploadFile.mockResolvedValue(replacement);
    const { onEditMessage, user } = setup();
    await openEdit(user);
    await user.upload(
      screen.getByLabelText("Choose a replacement file"),
      new File(["x"], "new.png", { type: "image/png" })
    );
    await user.click(screen.getByTitle("Save"));
    await waitFor(() =>
      expect(onEditMessage).toHaveBeenCalledWith("m1", "see attached", replacement)
    );
  });

  it("stays in edit mode and shows an error when the upload fails", async () => {
    uploadFile.mockRejectedValue(new Error("Upload failed"));
    const { onEditMessage, user } = setup();
    await openEdit(user);
    await user.upload(
      screen.getByLabelText("Choose a replacement file"),
      new File(["x"], "new.png", { type: "image/png" })
    );
    await user.click(screen.getByTitle("Save"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Upload failed");
    expect(onEditMessage).not.toHaveBeenCalled();
    expect(screen.getByTitle("Save")).toBeInTheDocument();
  });

  it("refuses to save an empty message once the only attachment is removed", async () => {
    const { onEditMessage, user } = setup({ text: "" });
    await openEdit(user);
    await user.click(screen.getByRole("button", { name: "Remove file" }));
    await user.click(screen.getByTitle("Save"));
    expect(onEditMessage).not.toHaveBeenCalled();
  });

  it("allows clearing the caption when the attachment stays", async () => {
    const { onEditMessage, user } = setup();
    await openEdit(user);
    await user.clear(screen.getByPlaceholderText("Caption (optional)"));
    await user.click(screen.getByTitle("Save"));
    expect(onEditMessage).toHaveBeenCalledWith("m1", "");
  });
});
