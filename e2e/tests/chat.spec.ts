import { test, expect, type Page } from "@playwright/test";
import { loginAsNewUser } from "./fixtures";

/** Hovers the message bubble containing `text` (the "⋮" options button is
 * only shown via a `group-hover` CSS rule — see MessageList.tsx — so it
 * has to be hovered before Playwright will treat the button as visible
 * and clickable) and opens its options menu. */
async function openMessageMenu(page: Page, text: string) {
  const bubble = page.locator("div.group", { hasText: text });
  await bubble.hover();
  await bubble.getByRole("button", { name: "Message options" }).click();
}

test.describe("Real-time messaging", () => {
  test("two users in the same room see each other's messages in real time", async ({
    page,
    browser,
    request,
  }) => {
    const userA = await loginAsNewUser(page, request, { firstName: "Ada", lastName: "Lovelace" });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginAsNewUser(pageB, request, { firstName: "Alan", lastName: "Turing" });

    const text = `Hello from ${userA.firstName} ${Date.now()}`;
    await page.getByPlaceholder("Type a message...").fill(text);
    await page.getByRole("button", { name: "Send" }).click();

    // Own message shows immediately...
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    // ...and the other, independently-connected client receives it over
    // the shared WebSocket room without reloading.
    await expect(pageB.getByText(text, { exact: true })).toBeVisible();

    await contextB.close();
  });
});

test.describe("Direct messages", () => {
  test("starting a DM from user search opens a private conversation", async ({
    page,
    browser,
    request,
  }) => {
    const userA = await loginAsNewUser(page, request, { firstName: "Ada", lastName: "Lovelace" });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const userB = await loginAsNewUser(pageB, request, { firstName: "Alan", lastName: "Turing" });

    // Not exact: true — the result button's accessible name includes the
    // avatar's fallback glyph too (e.g. "? Alan Turing-..."), so the
    // firstName+lastName text is only ever a substring of it, never an
    // exact match. Substring matching is safe now that every signed-up
    // user's name is timestamp-unique (see fixtures.ts).
    await page.getByPlaceholder("Find people...").fill(userB.lastName);
    await page.getByRole("button", { name: `${userB.firstName} ${userB.lastName}` }).click();

    // ChatInterface's DM header reads the *live* WebSocket "users" list for
    // the room (see ChatInterface.tsx's dmPartner/roomLabel), not the
    // conversation record — so it only ever shows a name for someone
    // actually connected to this exact room right now. userA switching
    // into the room alone isn't enough; userB has to open the same
    // conversation too (the room id is deterministic from the two user
    // ids, so this always resolves to the one shared room) before the
    // header has anyone but userA to show.
    await pageB.getByPlaceholder("Find people...").fill(userA.lastName);
    await pageB.getByRole("button", { name: `${userA.firstName} ${userA.lastName}` }).click();

    await expect(page.getByRole("heading", { name: userB.wsUsername })).toBeVisible();
    // ...and the sidebar's Direct Messages list picks up the new
    // conversation (GET /api/conversations refetches after it's created),
    // reading the other participant's full name from the REST response.
    await expect(page.locator("div.group", { hasText: userB.name })).toBeVisible();

    await contextB.close();
  });
});

test.describe("Editing and deleting messages", () => {
  test("editing your own message marks it as edited for other participants", async ({
    page,
    browser,
    request,
  }) => {
    await loginAsNewUser(page, request, { firstName: "Ada", lastName: "Lovelace" });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginAsNewUser(pageB, request, { firstName: "Alan", lastName: "Turing" });

    const original = `Original message ${Date.now()}`;
    const edited = `Edited message ${Date.now()}`;

    await page.getByPlaceholder("Type a message...").fill(original);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(pageB.getByText(original, { exact: true })).toBeVisible();

    await openMessageMenu(page, original);
    await page.getByRole("button", { name: "Edit" }).click();
    // Once edit mode replaces the bubble's text with an <input>, a
    // hasText-based locator can no longer find it (the text it matched on
    // is gone) — scope by structure instead. MessageInput's own compose
    // box is a sibling outside any "group" wrapper, so this can only match
    // the one in-place edit field.
    const editInput = page.locator("div.group input");
    await editInput.fill(edited);
    await editInput.press("Enter");

    await expect(page.getByText(edited, { exact: true })).toBeVisible();
    await expect(page.getByText("(edited)")).toBeVisible();
    // The other participant sees the same update pushed over the socket.
    await expect(pageB.getByText(edited, { exact: true })).toBeVisible();

    await contextB.close();
  });

  test("deleting your own message removes it for other participants", async ({
    page,
    browser,
    request,
  }) => {
    await loginAsNewUser(page, request, { firstName: "Ada", lastName: "Lovelace" });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginAsNewUser(pageB, request, { firstName: "Alan", lastName: "Turing" });

    const text = `Delete me ${Date.now()}`;
    await page.getByPlaceholder("Type a message...").fill(text);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(pageB.getByText(text, { exact: true })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await openMessageMenu(page, text);
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(text, { exact: true })).toHaveCount(0);
    await expect(pageB.getByText(text, { exact: true })).toHaveCount(0);

    await contextB.close();
  });
});

test.describe("Conversation management", () => {
  test("deleting a conversation removes it from the sidebar", async ({
    page,
    browser,
    request,
  }) => {
    await loginAsNewUser(page, request, { firstName: "Ada", lastName: "Lovelace" });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const userB = await loginAsNewUser(pageB, request, { firstName: "Alan", lastName: "Turing" });
    await contextB.close();

    // Not exact: true — see the note in the "starting a DM" test above;
    // the result button's accessible name also carries the avatar's
    // fallback glyph, so only a substring match works.
    await page.getByPlaceholder("Find people...").fill(userB.lastName);
    await page.getByRole("button", { name: `${userB.firstName} ${userB.lastName}` }).click();

    // Unlike the "starting a DM" test, userB's browser is already closed
    // here — there's no live WS presence, so the header would just show
    // the "Direct Message" fallback (see ChatInterface.tsx's roomLabel).
    // The sidebar's Direct Messages list is populated from the REST API
    // regardless of who's currently connected, so check that instead —
    // it's also what this test cares about (that the row is there, then
    // gone after deleting). Same "group" convention as message bubbles
    // (Sidebar.tsx) — the "⋮" options button only shows on hover, and this
    // is the innermost element carrying both the row's text and that
    // hover behavior.
    const conversationRow = page.locator("div.group", { hasText: userB.name });
    await expect(conversationRow).toBeVisible();
    await conversationRow.hover();
    await conversationRow.getByRole("button", { name: `Options for ${userB.name}` }).click();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(
      page.getByRole("button", { name: `Options for ${userB.name}` }),
    ).toHaveCount(0);
  });
});
