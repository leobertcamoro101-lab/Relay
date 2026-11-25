---
Convention: Responsive by default
---

Every file created or edited for Relay must be responsive (mobile, tablet, desktop) by default — not only when explicitly requested. Use Tailwind responsive utilities (`sm:`, `md:`, `lg:`) rather than fixed pixel widths for layout containers.

Update 2026-09-17: The known gap below is fixed. `client/src/pages/authenticated/Sidebar.tsx` is now an off-canvas drawer below the `md` breakpoint (`fixed` + translate-x transform, driven by `isOpen`/`onClose` props from `ChatInterface.tsx`) with a tap-to-dismiss backdrop, and sits `static` at `md:` and up as before. This same Sidebar rewrite also added the Direct Messages list (fetched from `/api/conversations`) with a per-conversation delete icon — entries whose other participant no longer exists render as "Unknown user" and are deletable via `DELETE /api/conversations/:roomId`.

Original known gap (2026-09-13), for reference: `client/src/Navigation/ChatInterface.tsx` rendered `Sidebar` at a fixed `w-56` permanently alongside the chat pane, with no collapse/hide behavior on narrow screens.

---
Convention: Message attachments (added 2026-11-19)
---

Messages can carry one file (image, video, document). How it works and what to keep in mind:

**Sending**
- The file bytes go over REST, not WebSocket: `POST ${VITE_BACKEND_URL}/upload` (multipart field `file`, `Authorization: Bearer <token>`, no manual Content-Type). The server (`routes/upload-routes.ts` → `middleware/file-upload.ts`) streams it to Cloudinary folder `relay/attachments` with `resource_type: "auto"` and returns `{ url }`.
- The client then sends the normal WebSocket `MESSAGE` with `attachment: { url, name, type, size }`. Text is optional when an attachment is present; a message needs text or an attachment.
- Server limits: 25 MB and a MIME allowlist in `middleware/file-upload.ts`. The client mirrors this in `client/src/utils/attachments.ts` (`MAX_ATTACHMENT_BYTES`, `ATTACHMENT_ACCEPT`) — keep the two in sync. The avatar upload (`upload` / `uploadToCloudinary`) is separate and stays PNG/JPG, 5 MB.
- `sanitizeAttachment` in `server/src/index.ts` validates the shape of an attachment only, not that the URL is ours. Don't treat `attachment.url` as trusted.

**Editing a sent message** (sender only; ownership is checked server-side)
- `EDIT_MESSAGE` carries `attachment`: omitted = leave as is, `null` = remove, object = replace (upload the new file first). The server rejects an edit that would leave no text and no attachment, and broadcasts `MESSAGE_EDITED` with the resulting `attachment` (`null` if none).
- Plain text edits must still call `onEditMessage(id, text)` with two arguments (the third argument is only passed when the attachment changes) — existing tests rely on it.

**Cloudinary cleanup**
- Only the URL is stored (no `public_id`). `server/src/util/attachment-cleanup.ts` derives the public id and resource type from the URL and deletes the old file when an attachment is removed or replaced, and when a message is deleted.
- Safety rules in that util: it only deletes inside `relay/attachments/` in our own cloud (never avatars), and it skips deletion while any other message still references the same URL. It runs in the background and only logs on failure, so a Cloudinary problem never blocks an edit or delete.
- Render needs `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` set.
- One-off script for stray files: `cd server; npx tsx scripts/cleanup-orphaned-attachments.ts` (dry run, lists files no message references) and add `--delete` to remove them. It reads `server/.env`, so point it at the same database the Cloudinary account is used by; it skips files uploaded in the last hour. `scripts/` is in the `exclude` list of `server/tsconfig.json` — keep it there or Render's `tsc` build fails (TS6059, outside `rootDir`).

**Client structure** (`client/src/pages/authenticated/`)
- `MessageInput.tsx` (composer) uses `components/FilePicker.tsx` for the paperclip: icon-only, validates type/size via `utils/attachments.ts`.
- `MessageList.tsx` renders messages and keeps one shared hidden `<input type="file">` at the root of the list for "replace file". Keep it outside each message's `div.group`: the Playwright edit test uses `div.group input` and expects a single input there.
- `MessageEditPanel.tsx` is the in-place editor; `hooks/useAttachmentEditing.ts` holds keep/remove/replace state and save logic next to `hooks/useMessageEditing.ts`. `AttachmentPreview.tsx` and `TypingIndicator.tsx` are small extracted components.

---
Convention: Message reactions (added 2026-11-20)
---

Anyone in a room can react to any message in that room (their own or others') with one of six emoji. Reactions are saved on the message and survive refresh and re-login.

**Data and events**
- Stored on the message as `reactions: { [emoji]: userId[] }` (Mongoose `Mixed`, so each emoji key can be updated atomically with `$addToSet` / `$pull`). History (`getRecentMessages`) returns them through `normalizeReactions`, which drops empty emoji.
- Client sends `TOGGLE_REACTION { id, emoji }`. The server (`TOGGLE_REACTION` case in `server/src/index.ts`) only accepts messages in the sender's current room, reads the message to see whether the user already reacted, then adds or removes them and broadcasts `REACTIONS_UPDATED { id, reactions }` (the full set, empties removed) to the room. The client reducer in `useWebSocket.ts` replaces that message's `reactions`.
- Allowed emoji: 👍 ❤️ 😂 😮 😢 🎉. The list lives in two places and must stay identical: `server/src/util/reactions.ts` (enforced, anything else is ignored) and `client/src/utils/reactions.ts`. Note ❤️ includes a variation selector, so copy it rather than retyping it.

**Client structure** (`client/src/pages/authenticated/`)
- `ReactionPicker.tsx`: the smiley button + emoji popover, one instance per message with its own open state (uses `useClickOutside`).
- `ReactionBar.tsx`: the chips under a message (`👍 2`); highlighted when you reacted, click toggles.
- `MessageList` takes an optional `onToggleReaction(id, emoji)`; without it no picker is shown and chips are read-only, which keeps older tests and callers working. `ChatInterface` passes `toggleReaction` from `useWebSocket`.

**Hover vs touch**
- The picker, Reply and ⋮ buttons are hidden until you hover or focus a message on devices with a mouse. On touch devices (`@media (hover: none)`) they are always visible. This is by device type, not screen width: Chrome DevTools device mode emulates touch, so buttons show there even at a wide width.
- The picker popover takes `align`: `right` for your own messages (opens leftwards), `left` for others' (opens rightwards) so it isn't clipped by the sidebar.

**Tests**: `client/tests/components/Reactions.test.tsx`, `server/tests/util/reactions.test.ts`.

---
Convention: Replies (added 2026-11-20)
---

A message can quote another message in the same room. The reply shows a small preview (author + text, or the attachment name) at the top of its bubble; clicking the preview scrolls to the original and briefly highlights it.

**Data and events**
- Client sends `MESSAGE { text, attachment?, replyTo?: <message id> }`. Only the id is sent; the server looks the message up with `{ _id, room: client.room }` (so you can't quote a message from another room), and stores a **snapshot** on the new message: `replyTo: { id, username, text (truncated to 100 chars), attachmentName? }` (`server/src/util/reply.ts`). An invalid or unknown id just sends a normal message with no quote.
- The snapshot is deliberate: the quote still renders after the original is edited or deleted, and it comes back with room history (`getRecentMessages`). The trade-off is that the quote does **not** update when the original is edited.
- Edits to a reply (`EDIT_MESSAGE`) never touch `replyTo`.
- If the original isn't in the loaded history (older than the last 50 messages) or was deleted, clicking the quote does nothing.

**Client structure** (`client/src/pages/authenticated/`)
- `ChatInterface` owns `replyingTo` state (cleared on room change) and passes `onReply` to `MessageList` and `replyingTo` / `onCancelReply` to `MessageInput`.
- `MessageInput` shows a "Replying to <name>" banner above the composer (X or Escape cancels, input is focused). It calls `onSend(text, attachment, replyToId)` **only when replying**; plain sends still call `onSend(text, attachment)` with two arguments, which existing tests rely on.
- `MessageList` takes an optional `onReply(message)` (no prop = no Reply button). Each row has `id="msg-<messageId>"`, used by the jump-to-original scroll. `ReplyQuote.tsx` renders the quote.

**Tests**: `client/tests/components/Reply.test.tsx`, `server/tests/util/reply.test.ts`.

---
Convention: Unread dots and sidebar order (added 2026-11-23)
---

A room or DM that gets a message while you are looking at a different room shows a colored dot in the sidebar and moves to the top of its list.

**Live updates**
- The server only sends a room's messages to people currently in that room, so it sends a separate small `UNREAD { room, timestamp }` event (no message content) to everyone else who is connected. `notifyUnread` in `server/src/index.ts` does this after each `MESSAGE`, using `getUnreadRecipients` (`server/src/util/unread.ts`): skips the sender (including their other tabs) and anyone already in that room, and uses `canJoinRoom` so a DM only pings its two participants. `index.ts` keeps an `activeClients` set (added on JOIN, removed on close) to find those connections.
- `useWebSocket` keeps two maps: `unreadRooms` (room -> count, cleared when you open the room) and `roomActivity` (room -> time of the latest message, never cleared, so the order sticks after you read it). A message in the room you are in also bumps `roomActivity`, so the room you are chatting in stays on top.

**Saved read state (survives refresh, logout, other devices)**
- `models/read-state.ts` has a `ReadState` collection: one document per (userId, room) with `lastReadAt`. `markRoomRead` upserts it with `$max` (never moves backwards): on JOIN, on SWITCH_ROOM (both the room you leave and the one you enter), and when the socket closes. Failures only log; it is skipped when there is no DB connection (so the websocket tests don't queue Mongo calls).
- On JOIN the server adds `unread` and `activity` to the `WELCOME` message (`getUnreadSnapshot`; it is not a separate message, so nothing arrives between WELCOME and the next event, which the websocket tests rely on): for the public rooms plus the user's DMs (matched by `dmRoomPattern`) it computes each room's newest message time and counts other people's messages newer than `lastReadAt` (counts capped at 99, never for the room you're in). The client replaces `unreadRooms` with it and merges `activity` (max per room), so the sidebar is sorted by recent activity from the first render.
- `PUBLIC_ROOMS` in `server/src/util/read-state.ts` must match `ROOMS` in `Sidebar.tsx`.
- A room with no read marker counts as read up to `UNREAD_START` (a constant in `util/read-state.ts`), otherwise the first deploy would flag all existing history as unread. A brand-new DM sent after that date still shows as unread. Move the constant if you ever backfill.
- Joining a room counts as reading it, so a refresh must put you back in the room you were in, otherwise #general would be marked read on every reload. `client/src/utils/lastRoom.ts` keeps the current room in `sessionStorage` (per tab); `ChatInterface` saves it once connected (clears it when you're in the default room) and connects with `getLastRoom() ?? "general"`, both on first load and on automatic reconnects. `useWebSocket` clears it when the server closes the socket with 4001 or 4003 so a bad remembered room can't cause a reconnect loop.

**Hidden tabs (added 2026-11-25)**
- "Read" means the room is open on the socket **and the tab is visible** (`document.hidden` is false). Window focus doesn't matter, so a visible window beside another one still counts as reading.
- The client sends `VISIBILITY { visible }` on `visibilitychange`, and right after WELCOME if the tab is already hidden. The server keeps `hiddenSince` (a `WeakMap` per connection in `index.ts`). While a connection is hidden, `getUnreadRecipients` (its optional `isHidden` argument) pings it for its own open room too, and `markRoomRead` on switch/close uses the hidden-since time (`readAt`) instead of now, so messages that arrived while hidden stay unread after a refresh or logout. Becoming visible again marks the room read.
- On the client, `UNREAD` for the open room is counted only while `document.hidden`; the open room's dot is cleared as soon as the tab is visible again.
- Not handled: a tab that is hidden at the moment it connects (refresh of a background tab) marks the room read on JOIN, before it reports `VISIBILITY false`.

**Sidebar**
- `Sidebar` takes optional `unread` and `activity` props: rooms and DMs are sorted newest-activity first (stable, so ones with no activity keep their default order below). The dot also appears next to the person in the Online list if you have a DM with them, and on the mobile menu button when anything is unread.
- If someone starts a DM with you, `ChatInterface` re-fetches the DM list once (`refreshConversations` from `useConversations`) because the room pings (or the snapshot lists it) before it is in the DM list.

**Tests**: `server/tests/util/unread.test.ts`, `server/tests/util/read-state.test.ts` (the counting logic; the Mongo queries themselves aren't covered by a test), `client/tests/components/Sidebar-unread.test.tsx`, `client/tests/hooks/useWebSocket-unread.test.tsx`, `client/tests/hooks/useWebSocket-visibility.test.tsx`, `client/tests/utils/lastRoom.test.ts`, `client/tests/hooks/useWebSocket-lastRoom.test.tsx`.
