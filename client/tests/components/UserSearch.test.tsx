import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserSearch from "../../src/pages/authenticated/UserSearch";
import { AuthContext, type AuthContextType } from "../../src/context/auth-context";

// useHttpClient wraps fetch with loading/error state; mocking it directly
// keeps this test about UserSearch's own behavior (query -> render results ->
// select) rather than fetch plumbing.
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

function renderSearch(onSelectUser = vi.fn()) {
  render(
    <AuthContext.Provider value={authValue}>
      <UserSearch onSelectUser={onSelectUser} />
    </AuthContext.Provider>
  );
  return { onSelectUser };
}

beforeEach(() => {
  sendRequestMock.mockReset();
});

describe("Searching for a user", () => {
  it("does not search on an empty or whitespace-only query", async () => {
    renderSearch();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Find people...");

    await user.type(input, "   ");

    expect(sendRequestMock).not.toHaveBeenCalled();
  });

  it("searches and renders matching users", async () => {
    sendRequestMock.mockResolvedValue({
      users: [{ id: "u1", firstName: "Bea", lastName: "Bob", image: "" }],
    });
    renderSearch();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Find people...");

    await user.type(input, "bea");

    expect(await screen.findByText("Bea Bob")).toBeInTheDocument();
    expect(sendRequestMock).toHaveBeenCalledWith(
      expect.stringContaining("/users?q=bea"),
      "GET",
      null,
      { Authorization: "Bearer test-token" }
    );
  });

  it('shows "No users found." when the search returns no results', async () => {
    sendRequestMock.mockResolvedValue({ users: [] });
    renderSearch();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Find people...");

    await user.type(input, "nobody");

    expect(await screen.findByText("No users found.")).toBeInTheDocument();
  });

  it("clears results and closes the dropdown when the query is cleared", async () => {
    sendRequestMock.mockResolvedValue({
      users: [{ id: "u1", firstName: "Bea", lastName: "Bob", image: "" }],
    });
    renderSearch();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Find people...");

    await user.type(input, "bea");
    expect(await screen.findByText("Bea Bob")).toBeInTheDocument();

    await user.clear(input);

    await waitFor(() => {
      expect(screen.queryByText("Bea Bob")).not.toBeInTheDocument();
    });
  });

  it("does not crash and leaves the dropdown closed when the request fails", async () => {
    sendRequestMock.mockRejectedValue(new Error("network error"));
    renderSearch();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Find people...");

    await user.type(input, "bea");

    await waitFor(() => expect(sendRequestMock).toHaveBeenCalled());
    expect(screen.queryByText("No users found.")).not.toBeInTheDocument();
    expect(screen.queryByText("Bea Bob")).not.toBeInTheDocument();
  });
});

describe("Selecting a result", () => {
  it("calls onSelectUser with the picked user's id and clears the search", async () => {
    sendRequestMock.mockResolvedValue({
      users: [{ id: "u1", firstName: "Bea", lastName: "Bob", image: "" }],
    });
    const { onSelectUser } = renderSearch();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Find people...");

    await user.type(input, "bea");
    const result = await screen.findByText("Bea Bob");
    await user.click(result);

    expect(onSelectUser).toHaveBeenCalledWith("u1");
    expect(input).toHaveValue("");
    expect(screen.queryByText("Bea Bob")).not.toBeInTheDocument();
  });
});
