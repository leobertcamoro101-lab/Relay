// Who should get an "unread" ping when a message is posted in `room`?
//
// Everyone connected who is NOT currently in that room (they already see the
// message live), is not the sender (their own messages aren't unread, and that
// covers the sender's other tabs too), and is allowed to be in the room — so a
// DM only pings its two participants, while public rooms ping everyone.
//
// A client in the room whose tab is hidden (`isHidden`) is not looking at it, so
// it is pinged too and the message stays unread until the tab is visible again.
export function getUnreadRecipients<T extends { userId: string; room: string }>(
  clients: Iterable<T>,
  room: string,
  senderUserId: string,
  canJoin: (room: string, userId: string) => boolean,
  isHidden: (client: T) => boolean = () => false,
): T[] {
  const out: T[] = [];
  for (const c of clients) {
    if (c.userId === senderUserId) continue;
    if (c.room === room && !isHidden(c)) continue;
    if (!canJoin(room, c.userId)) continue;
    out.push(c);
  }
  return out;
}
