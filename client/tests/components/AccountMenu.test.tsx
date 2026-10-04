import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AccountMenu from "../../src/pages/authenticated/AccountMenu";
import { AuthContext, type AuthContextType } from "../../src/context/auth-context";

function renderMenu(overrides: Partial<AuthContextType> = {}) {
  const authValue: AuthContextType = {
    isLoggedIn: true,
    userId: "me",
    name: "Alice",
    image: null,
    token: "test-token",
    login: vi.fn(),
    logout: vi.fn(),
    updateUserInfo: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <AccountMenu />
      </AuthContext.Provider>
    </MemoryRouter>
  );
  return authValue;
}

describe("Logged-out state", () => {
  it("renders nothing when the user is not logged in", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            isLoggedIn: false,
            userId: null,
            name: null,
            image: null,
            token: null,
            login: vi.fn(),
            logout: vi.fn(),
            updateUserInfo: vi.fn(),
          }}
        >
          <AccountMenu />
        </AuthContext.Provider>
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Menu open/close", () => {
  it("opens the menu when the account button is clicked", async () => {
    renderMenu();
    const user = userEvent.setup();

    expect(screen.queryByText("Profile")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Account menu"));

    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByLabelText("Logout")).toBeInTheDocument();
  });

  it("closes the menu when clicking outside of it", async () => {
    renderMenu();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Account menu"));
    expect(screen.getByText("Profile")).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });

  it("closes the menu after clicking the Profile link", async () => {
    renderMenu();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Account menu"));
    await user.click(screen.getByText("Profile"));

    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });
});

describe("Logout", () => {
  it("calls auth.logout() when Logout is clicked", async () => {
    const authValue = renderMenu();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Account menu"));
    await user.click(screen.getByLabelText("Logout"));

    expect(authValue.logout).toHaveBeenCalledTimes(1);
  });

  it("closes the menu after logging out", async () => {
    renderMenu();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Account menu"));
    await user.click(screen.getByLabelText("Logout"));

    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });
});
