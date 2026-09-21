import { test, expect } from "@playwright/test";
import { BASE_URL } from "./env";
import { signupViaApi, uniqueEmail, VALID_PASSWORD } from "./fixtures";

test.describe("Signup", () => {
  test("lets a new user sign up and land in the chat", async ({ page }) => {
    await page.goto("/signup");

    // exact: true — "John" is otherwise a case-insensitive substring match
    // of the email field's placeholder ("john@example.com") too.
    await page.getByPlaceholder("John", { exact: true }).fill("Grace");
    await page.getByPlaceholder("Doe").fill("Hopper");
    await page.locator('input[type="date"]').fill("1995-05-15");
    await page.locator("select").selectOption("female");
    await page.getByPlaceholder("john@example.com").fill(uniqueEmail("e2e-signup"));
    await page.getByPlaceholder("••••••••").fill(VALID_PASSWORD);

    await page.getByRole("button", { name: "Submit" }).click();

    // A successful signup logs the user in and redirects to /relay, where
    // ChatInterface waits for the WebSocket JOIN round-trip before
    // rendering — so this also proves the client, the REST API, and the
    // WebSocket server are all wired together correctly end to end.
    await expect(page).toHaveURL(`${BASE_URL}/relay`);
    await expect(page.getByRole("heading", { name: "# general" })).toBeVisible();
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible();
  });
});

test.describe("Login", () => {
  test("shows an error for invalid login credentials", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("john@example.com").fill(uniqueEmail("nobody"));
    await page.getByPlaceholder("••••••••").fill("wrong-password");
    await page.getByRole("button", { name: "Login" }).click();

    // Matches users-controller.ts's login() — same message whether the
    // email doesn't exist or the password is wrong, on purpose.
    await expect(
      page.getByText("Invalid credentials, could not log you in"),
    ).toBeVisible();
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  test("lets an existing user log in", async ({ page, request }) => {
    const user = await signupViaApi(request);

    await page.goto("/");
    await page.getByPlaceholder("john@example.com").fill(user.email);
    await page.getByPlaceholder("••••••••").fill(user.password);
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL(`${BASE_URL}/relay`);
    await expect(page.getByRole("heading", { name: "# general" })).toBeVisible();
  });
});

test.describe("Forgot / reset password", () => {
  test("forgot password always shows the same generic confirmation", async ({ page }) => {
    await page.goto("/forgot-password");

    // Deliberately an email nobody has signed up with. users-controller.ts's
    // forgotPassword() returns identically either way (so the response
    // never leaks whether an address is registered) and, for an unknown
    // email, returns before ever calling the real email provider — so this
    // assertion holds without needing a live email integration in CI.
    await page.getByPlaceholder("john@example.com").fill(uniqueEmail("unregistered"));
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(
      page.getByText("If that email exists, a reset link has been sent."),
    ).toBeVisible();
  });

  test("rejects an invalid or expired reset token", async ({ page }) => {
    await page.goto("/reset-password/not-a-real-token");

    const passwordFields = page.getByPlaceholder("••••••••");
    await passwordFields.nth(0).fill(VALID_PASSWORD);
    await passwordFields.nth(1).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(
      page.getByText("Reset link is invalid or has expired."),
    ).toBeVisible();
  });
});
