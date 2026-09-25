/**
 * ChatInterface.test.tsx
 *
 * ChatInterface gets its data from useWebSocket() and useConversations(),
 * not from fetch directly — so those two hooks are mocked, not global.fetch.
 * It reads `logout`/`token` off AuthContext via useContext, so that's
 * provided via a real AuthContext.Provider.
 *
 * Not tested here (out of scope for this component):
 *   - "doesn't fetch when unauthenticated" — ChatInterface has no such
 *     boundary itself; that's presumably RequireAuth.tsx's job.
 *   - Anything inside Sidebar/MessageList/MessageInput's own logic — those
 *     are mocked to keep this file about ChatInterface's own behavior:
 *     the connected/currentUser gate, sidebar open/close wiring, logout,
 *     and the authError → logout+redirect effect.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("../../src/hooks/useWebSocket", () => ({ useWebSocket: vi.fn() }));
vi.mock("../../src/hooks/useConversations", () => ({ useConversations: vi.fn() }));

vi.mock("../../src/pages/authenticated/AccountMenu", () => ({
  default: () => <div data-testid="account-menu" />,
}));
vi.mock("../../src/pages/authenticated/UserSearch", () => ({
  default: () => <div data-testid="user-search" />,
}));
vi.mock("../../src/pages/authenticated/MessageList", () => ({
  default: () => <div data-testid="message-list" />,
}));
vi.mock("../../src/pages/authenticated/MessageInput", () => ({
  default: () => <div data-testid="message-input" />,
}));

import ChatInterface from "../../src/pages/authenticated/ChatInterface";
import { AuthContext, type AuthContextType } from "../../src/context/auth-context";
import { useWebSocket } from "../../src/hooks/useWebSocket";
import { useConversations } from "../../src/hooks/useConversations";

const currentUser = { id: "me", username: "Alice" };

function baseWebSocketReturn(overrides: Partial<ReturnType<typeof useWebSocket>> = {}) {
  return {
    status: "connected",
    messages: [],
    users: [currentUser],
    onlineCount: 1,
    currentUser,
    currentRoom: "general",
    typingUsers: [],
    connect: vi.fn(),
    sendMessage: vi.fn(),
    sendTyping: vi.fn(),
    switchRoom: vi.fn(),
    authError: null,
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
    ...overrides,
  };
}

function baseConversationsReturn(overrides: Partial<ReturnType<typeof useConversations>> = {}) {
  return {
    conversations: [],
    startConversation: vi.fn(),
    deleteConversation: vi.fn(),
    ...overrides,
  };
}

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

function renderChatInterface() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <ChatInterface />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.mocked(useWebSocket).mockReturnValue(baseWebSocketReturn());
  vi.mocked(useConversations).mockReturnValue(baseConversationsReturn());
  navigateMock.mockClear();
  authValue.logout = vi.fn();
});

describe("Connection gate", () => {
  it("shows the loading spinner while status is not 'connected'", () => {
    vi.mocked(useWebSocket).mockReturnValue(baseWebSocketReturn({ status: "connecting" }));
    renderChatInterface();

    expect(screen.queryByLabelText("Open menu")).not.toBeInTheDocument();
  });

  it("shows the loading spinner when connected but currentUser is not yet set", () => {
    vi.mocked(useWebSocket).mockReturnValue(
      baseWebSocketReturn({ status: "connected", currentUser: null })
    );
    renderChatInterface();

    expect(screen.queryByLabelText("Open menu")).not.toBeInTheDocument();
  });

  it("renders the chat UI once connected with a currentUser", () => {
    renderChatInterface();

    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
    expect(screen.getByTestId("message-list")).toBeInTheDocument();
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
  });
});

describe("Sidebar open/close wiring", () => {
  it("opens the sidebar when the header menu button is clicked", async () => {
    const { container } = renderChatInterface();
    const user = userEvent.setup();

    expect(container.querySelector(".bg-black\\/50")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Open menu"));

    expect(container.querySelector(".bg-black\\/50")).toBeInTheDocument();
  });

  it("closes the sidebar when its backdrop is clicked", async () => {
    const { container } = renderChatInterface();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Open menu"));
    expect(container.querySelector(".bg-black\\/50")).toBeInTheDocument();

    await user.click(container.querySelector(".bg-black\\/50") as Element);

    await waitFor(() => {
      expect(container.querySelector(".bg-black\\/50")).not.toBeInTheDocument();
    });
  });
});

describe("Logout", () => {
  it("calls logout() and navigates to / when the logout button is clicked", async () => {
    renderChatInterface();
    const user = userEvent.setup();

    await user.click(screen.getByTitle("Log out"));

    expect(authValue.logout).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith("/");
  });
});

describe("authError effect", () => {
  it("logs out and redirects to / when the socket reports an auth error", async () => {
    vi.mocked(useWebSocket).mockReturnValue(
      baseWebSocketReturn({ authError: "Session expired" })
    );
    renderChatInterface();

    await waitFor(() => {
      expect(authValue.logout).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith("/");
    });
  });
});

describe("Conversations pass-through", () => {
  it("renders a conversation from useConversations in the Sidebar", () => {
    vi.mocked(useConversations).mockReturnValue(
      baseConversationsReturn({
        conversations: [
          { roomId: "dm_a_b", otherUser: { id: "b", firstName: "Bea", lastName: "Bob", image: "" } },
        ],
      })
    );
    renderChatInterface();

    expect(screen.getByText("Bea Bob")).toBeInTheDocument();
  });
});
