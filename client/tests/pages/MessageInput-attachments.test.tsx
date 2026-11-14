import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageInput from "../../src/pages/authenticated/MessageInput";
import { AuthContext, type AuthContextType } from "../../src/context/auth-context";

// useHttpClient wraps fetch; mocking it directly keeps this test about
// MessageInput's own upload/validation/send logic rather than fetch
// plumbing — same approach as UserSearch.test.tsx.
const sendRequestMock = vi.fn();
vi.mock("../../src/hooks/useHttpClient", () => ({
  useHttpClient: () => ({ sendRequest: sendRequestMock }),
}));

const authValue: AuthContextType = {
  isLoggedIn: true,
  userId: "me",
  name: "Alice",
  image: null,
  token: "test-token",
  login: vi.fn(),
  logout: vi.fn(),
  updateUserInfo: vi.fn(),
};

function renderInput(overrides: Partial<{ onSend: ReturnType<typeof vi.fn>; onTyping: ReturnType<typeof vi.fn> }> = {}) {
  const onSend = overrides.onSend ?? vi.fn();
  const onTyping = overrides.onTyping ?? vi.fn();
  render(
    <AuthContext.Provider value={authValue}>
      <MessageInput onSend={onSend} onTyping={onTyping} />
    </AuthContext.Provider>
  );
  return { onSend, onTyping };
}

function makeFile(name: string, type: string, sizeBytes: number) {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
}

beforeEach(() => {
  sendRequestMock.mockReset();
  // jsdom doesn't implement createObjectURL/revokeObjectURL
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
});

describe("Selecting a file", () => {
  it("shows a preview card with the file's name and size", async () => {
    renderInput();
    const user = userEvent.setup();
    const file = makeFile("report.pdf", "application/pdf", 2048);

    const input = screen.getByLabelText("Choose a file to attach");
    await user.upload(input, file);

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  });

  it("rejects a file over the size limit and does not show a preview", async () => {
    renderInput();
    const user = userEvent.setup();
    const tooBig = makeFile("movie.mp4", "video/mp4", 26 * 1024 * 1024);

    const input = screen.getByLabelText("Choose a file to attach");
    await user.upload(input, tooBig);

    expect(await screen.findByRole("alert")).toHaveTextContent("larger than");
    expect(screen.queryByText("movie.mp4")).not.toBeInTheDocument();
  });

  it("removes the selected file when the X button is clicked", async () => {
    renderInput();
    const user = userEvent.setup();
    const file = makeFile("photo.png", "image/png", 1024);

    await user.upload(screen.getByLabelText("Choose a file to attach"), file);
    expect(screen.getByText("photo.png")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Remove attachment"));

    expect(screen.queryByText("photo.png")).not.toBeInTheDocument();
  });
});

describe("Sending a message with a file", () => {
  it("uploads the file and sends the message with the resulting attachment", async () => {
    sendRequestMock.mockResolvedValue({ url: "https://cdn.example.com/f/photo.png" });
    const { onSend } = renderInput();
    const user = userEvent.setup();
    const file = makeFile("photo.png", "image/png", 1024);

    await user.upload(screen.getByLabelText("Choose a file to attach"), file);
    await user.type(screen.getByPlaceholderText("Add a caption (optional)..."), "check this out");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith("check this out", {
        url: "https://cdn.example.com/f/photo.png",
        name: "photo.png",
        type: "image/png",
        size: 1024,
      });
    });

    // POSTs as multipart form data, not JSON, with the auth token attached
    expect(sendRequestMock).toHaveBeenCalledWith(
      expect.stringContaining("/upload"),
      "POST",
      expect.any(FormData),
      { Authorization: "Bearer test-token" }
    );
  });

  it("allows sending a file with no caption text", async () => {
    sendRequestMock.mockResolvedValue({ url: "https://cdn.example.com/f/doc.pdf" });
    const { onSend } = renderInput();
    const user = userEvent.setup();
    const file = makeFile("doc.pdf", "application/pdf", 512);

    await user.upload(screen.getByLabelText("Choose a file to attach"), file);
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith("", expect.objectContaining({ name: "doc.pdf" }));
    });
  });

  it("clears the file preview after a successful send", async () => {
    sendRequestMock.mockResolvedValue({ url: "https://cdn.example.com/f/doc.pdf" });
    renderInput();
    const user = userEvent.setup();
    const file = makeFile("doc.pdf", "application/pdf", 512);

    await user.upload(screen.getByLabelText("Choose a file to attach"), file);
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.queryByText("doc.pdf")).not.toBeInTheDocument();
    });
  });

  it("keeps the file selected and shows an error if the upload fails", async () => {
    sendRequestMock.mockRejectedValue(new Error("Server is down"));
    const { onSend } = renderInput();
    const user = userEvent.setup();
    const file = makeFile("doc.pdf", "application/pdf", 512);

    await user.upload(screen.getByLabelText("Choose a file to attach"), file);
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Server is down");
    expect(screen.getByText("doc.pdf")).toBeInTheDocument();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables the send button and shows 'Uploading...' while the request is in flight", async () => {
    let resolveUpload: (value: { url: string }) => void;
    sendRequestMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      })
    );
    renderInput();
    const user = userEvent.setup();
    const file = makeFile("doc.pdf", "application/pdf", 512);

    await user.upload(screen.getByLabelText("Choose a file to attach"), file);
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByRole("button", { name: /uploading/i })).toBeDisabled();

    resolveUpload!({ url: "https://cdn.example.com/f/doc.pdf" });
    await waitFor(() => {
      expect(screen.queryByText("doc.pdf")).not.toBeInTheDocument();
    });
  });
});

describe("Submit button enablement", () => {
  it("stays disabled with no text and no file", () => {
    renderInput();
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("enables once a file is selected, even with no text", async () => {
    renderInput();
    const user = userEvent.setup();
    const file = makeFile("doc.pdf", "application/pdf", 512);

    await user.upload(screen.getByLabelText("Choose a file to attach"), file);

    expect(screen.getByRole("button", { name: /send/i })).not.toBeDisabled();
  });
});
