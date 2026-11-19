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
