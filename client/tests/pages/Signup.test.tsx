import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

const { default: Signup } = await import("../../src/pages/guest/Signup");
const { AuthContext } = await import("../../src/context/auth-context");
import type { AuthContextType } from "../../src/context/auth-context";

beforeEach(() => {
  sendRequest.mockReset();
  navigateMock.mockReset();
});

function renderSignup(authOverrides: Partial<AuthContextType> = {}) {
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
        <Signup />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return authValue;
}

// FormField doesn't wire a `htmlFor`/`id` pair, so the date input and the
// gender <select> can only be found by walking from their label text.
function fieldFor(labelText: string) {
  const label = screen.getByText(labelText);
  const wrapper = label.closest("div");
  return wrapper?.querySelector("input, select") as HTMLElement;
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("John"), "John");
  await user.type(screen.getByPlaceholderText("Doe"), "Doe");
  fireEvent.change(fieldFor("Birthday"), { target: { value: "2000-01-01" } });
  await user.selectOptions(fieldFor("Gender"), "female");
  await user.type(screen.getByPlaceholderText("john@example.com"), "john@example.com");
  await user.type(screen.getByPlaceholderText("••••••••"), "Str0ng!Pass");
  await user.click(screen.getByRole("button", { name: "Submit" }));
}

describe("Signup page", () => {
  it("shows validation errors when submitting an empty form", async () => {
    renderSignup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText(/First name must be at least 2 characters/)).toBeInTheDocument();
    expect(screen.getByText(/Last name must be at least 2 characters/)).toBeInTheDocument();
    expect(screen.getByText(/Birthday is required/)).toBeInTheDocument();
    expect(screen.getByText(/Please select a gender/)).toBeInTheDocument();
    expect(screen.getByText(/Please enter a valid email address/)).toBeInTheDocument();
    expect(screen.getByText(/Password must be at least 8 characters/)).toBeInTheDocument();
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it("rejects a password missing complexity requirements", async () => {
    renderSignup();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("john@example.com"), "john@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "alllowercase");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText(/Must contain at least one uppercase letter/)).toBeInTheDocument();
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it("signs up successfully, updates auth state, and navigates to /relay", async () => {
    const auth = renderSignup();
    const user = userEvent.setup();
    sendRequest.mockResolvedValueOnce({
      userId: "u2",
      token: "tok2",
      name: "John Doe",
      image: "",
    });

    await fillValidForm(user);

    expect(sendRequest).toHaveBeenCalledWith(
      expect.stringContaining("/users/signup"),
      "POST",
      JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        birthday: "2000-01-01",
        gender: "female",
        email: "john@example.com",
        password: "Str0ng!Pass",
      }),
      { "Content-Type": "application/json" },
    );
    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith("u2", "tok2", undefined, "John Doe", ""),
    );
    expect(navigateMock).toHaveBeenCalledWith("/relay");
  });

  it("shows a server error and does not log in when signup fails", async () => {
    const auth = renderSignup();
    const user = userEvent.setup();
    sendRequest.mockRejectedValueOnce(new Error("Email already in use"));

    await fillValidForm(user);

    expect(await screen.findByText("Email already in use")).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("links back to login", () => {
    renderSignup();
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/");
  });
});
