import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const sendRequest = vi.fn();
vi.mock("../../src/hooks/http-hook", () => ({
  useHttpClient: () => ({ sendRequest }),
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

const { default: Login } = await import("../../src/pages/guest/Login");
const { AuthContext } = await import("../../src/context/auth-context");
import type { AuthContextType } from "../../src/context/auth-context";

beforeEach(() => {
  sendRequest.mockReset();
  navigateMock.mockReset();
});

function renderLogin(authOverrides: Partial<AuthContextType> = {}) {
  const authValue: AuthContextType = {
    isLoggedIn: false,
    userId: null,
    name: null,
    image: null,
    token: null,
    login: vi.fn(),
    logout: vi.fn(),
    updateUserInfo: vi.fn(),
    ...authOverrides,
  };
  render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return authValue;
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, email: string, password: string) {
  await user.type(screen.getByPlaceholderText("john@example.com"), email);
  await user.type(screen.getByPlaceholderText("••••••••"), password);
  await user.click(screen.getByRole("button", { name: /Login/ }));
}

describe("Login page", () => {
  it("shows validation errors when submitting an empty form", async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Login/ }));

    expect(await screen.findByText(/Please enter a valid email address/)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/)).toBeInTheDocument();
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it("logs in successfully, updates auth state, and navigates to /relay", async () => {
    const auth = renderLogin();
    const user = userEvent.setup();
    sendRequest.mockResolvedValueOnce({
      userId: "u1",
      token: "tok1",
      name: "Alice",
      image: "avatar.png",
    });

    await fillAndSubmit(user, "alice@example.com", "secret123");

    expect(sendRequest).toHaveBeenCalledWith(
      expect.stringContaining("/users/login"),
      "POST",
      JSON.stringify({ email: "alice@example.com", password: "secret123" }),
      { "Content-Type": "application/json" },
    );
    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith("u1", "tok1", undefined, "Alice", "avatar.png"),
    );
    expect(navigateMock).toHaveBeenCalledWith("/relay");
  });

  it("shows a server error and does not log in when the request fails", async () => {
    const auth = renderLogin();
    const user = userEvent.setup();
    sendRequest.mockRejectedValueOnce(new Error("Invalid credentials"));

    await fillAndSubmit(user, "alice@example.com", "wrongpass");

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("links to forgot-password and signup", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /Forgot password/ })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
  });
});
