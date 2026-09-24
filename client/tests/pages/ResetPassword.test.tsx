import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const sendRequest = vi.fn();
vi.mock("../../src/hooks/useHttpClient.ts", () => ({
  useHttpClient: () => ({ sendRequest }),
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

const { default: ResetPassword } = await import("../../src/pages/guest/ResetPassword");

beforeEach(() => {
  sendRequest.mockReset();
  navigateMock.mockReset();
});

function renderResetPassword(token = "tok-123") {
  render(
    <MemoryRouter initialEntries={[`/reset-password/${token}`]}>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>,
  );
}

function passwordFields() {
  return screen.getAllByPlaceholderText("••••••••");
}

describe("ResetPassword page", () => {
  it("shows a validation error for a password that's too weak", async () => {
    renderResetPassword();
    const user = userEvent.setup();
    const [password, confirm] = passwordFields();

    await user.type(password, "short");
    await user.type(confirm, "short");
    await user.click(screen.getByRole("button", { name: /Reset password/ }));

    expect(await screen.findByText(/Password must be at least 8 characters/)).toBeInTheDocument();
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it("shows a validation error when the passwords don't match", async () => {
    renderResetPassword();
    const user = userEvent.setup();
    const [password, confirm] = passwordFields();

    await user.type(password, "Str0ng!Pass");
    await user.type(confirm, "Different1!");
    await user.click(screen.getByRole("button", { name: /Reset password/ }));

    expect(await screen.findByText(/Passwords do not match/)).toBeInTheDocument();
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it("resets the password using the token from the URL, then shows a success button that navigates to login", async () => {
    sendRequest.mockResolvedValueOnce({ message: "ok" });
    renderResetPassword("tok-123");
    const user = userEvent.setup();
    const [password, confirm] = passwordFields();

    await user.type(password, "Str0ng!Pass");
    await user.type(confirm, "Str0ng!Pass");
    await user.click(screen.getByRole("button", { name: /Reset password/ }));

    expect(sendRequest).toHaveBeenCalledWith(
      expect.stringContaining("/users/reset-password"),
      "POST",
      JSON.stringify({ token: "tok-123", password: "Str0ng!Pass" }),
      { "Content-Type": "application/json" },
    );
    const goToLogin = await screen.findByRole("button", { name: /Go to Login/ });
    expect(screen.getByText(/Your password has been reset successfully/)).toBeInTheDocument();

    await user.click(goToLogin);
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("shows a server error and keeps the form visible when the request fails", async () => {
    sendRequest.mockRejectedValueOnce(new Error("Invalid or expired token"));
    renderResetPassword();
    const user = userEvent.setup();
    const [password, confirm] = passwordFields();

    await user.type(password, "Str0ng!Pass");
    await user.type(confirm, "Str0ng!Pass");
    await user.click(screen.getByRole("button", { name: /Reset password/ }));

    expect(await screen.findByText("Invalid or expired token")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("••••••••")).toHaveLength(2);
  });
});
