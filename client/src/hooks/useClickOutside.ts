import { useEffect, useRef } from "react";

/**
 * Detects a mousedown outside the returned ref and calls onOutsideClick.
 * Pulled out of Sidebar.tsx, MessageList.tsx, and AccountMenu.tsx, which
 * each hand-rolled the same ref + mousedown-listener effect to close a
 * "⋮" or account menu when the user clicks elsewhere. Fix it once here
 * instead of in three places.
 */
export function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  onOutsideClick: () => void
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onOutsideClick]);

  return ref;
}
