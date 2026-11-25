import { useEffect } from "react";

// Shows the total unread count in the browser tab title, e.g. "(3) Relay", so
// you can see new messages from another tab. The original title is restored
// when the count drops to 0 and when the component unmounts.
export function useUnreadTitle(unread: Record<string, number>): number {
  const total = Object.values(unread).reduce((sum, n) => sum + n, 0);

  useEffect(() => {
    // Take the title as it is now, minus any "(n) " this hook added last time.
    const base = document.title.replace(/^\(\d+\+?\)\s/, "");
    document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [total]);

  return total;
}
