import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const sendRequest = vi.fn();
vi.mock("../../src/hooks/useHttpClient.ts", () => ({
  useHttpClient: () => ({ sendRequest }),
}));

const { default: ForgotPassword } = await import("../../src/pages/guest/ForgotPassword");

beforeEach(() => {
  sendRequest.mockReset();
});

function renderForgotPassword() {
  render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>,
  );
}

describe("ForgotPassword page", () => {
  it("shows a validation error when submitting an empty form", async () => {
    renderForgotPassword();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Send reset link/ }));

    expect(await screen.findByText(/Please enter a valid email address/)).toBeInTheDocument();
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it("submits the email and shows the confirmation message", async () => {
    sendRequest.mockResolvedValueOnce({ message: "ok" });
    renderForgotPassword();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("john@example.com"), "alice@example.com");
    await user.click(screen.getByRole("button", { name: /Send reset link/ }));

    expect(sendRequest).toHaveBeenCalledWith(
      expect.stringContaining("/users/forgot-password"),
      "POST",
      JSON.stringify({ email: "alice@example.com" }),
      { "Content-Type": "application/json" },
    );
    expect(
      await screen.findByText(/If that email exists, a reset link has been sent/),
    ).toBeInTheDocument();
    // the form is replaced by the confirmation message
    expect(screen.queryByPlaceholderText("john@example.com")).not.toBeInTheDocument();
  });

  it("shows a server error and keeps the form visible when the request fails", async () => {
    sendRequest.mockRejectedValueOnce(new Error("Something broke"));
    renderForgotPassword();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("john@example.com"), "alice@example.com");
    await user.click(screen.getByRole("button", { name: /Send reset link/ }));

    expect(await screen.findByText("Something broke")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("john@example.com")).toBeInTheDocument();
  });

  it("links back to login", () => {
    renderForgotPassword();
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/");
  });
});
