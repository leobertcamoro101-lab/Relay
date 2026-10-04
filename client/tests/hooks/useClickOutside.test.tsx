import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useClickOutside } from "../../src/hooks/useClickOutside";

// Extracted out of Sidebar.tsx, MessageList.tsx, and AccountMenu.tsx, which
// each hand-rolled this same ref + mousedown-listener pattern. These tests
// cover the hook directly rather than through any one consumer, since all
// three consumers now share this single implementation.
function TestComponent({ onOutsideClick }: { onOutsideClick: () => void }) {
  const ref = useClickOutside<HTMLDivElement>(onOutsideClick);
  return (
    <div>
      <div data-testid="inside" ref={ref}>
        <button>inner button</button>
      </div>
      <button data-testid="outside">outside button</button>
    </div>
  );
}

describe("useClickOutside", () => {
  it("calls the callback on a mousedown outside the ref", async () => {
    const onOutsideClick = vi.fn();
    render(<TestComponent onOutsideClick={onOutsideClick} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("outside"));

    expect(onOutsideClick).toHaveBeenCalledTimes(1);
  });

  it("does not call the callback on a mousedown inside the ref", async () => {
    const onOutsideClick = vi.fn();
    render(<TestComponent onOutsideClick={onOutsideClick} />);
    const user = userEvent.setup();

    await user.click(screen.getByText("inner button"));

    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  it("removes its event listener on unmount", async () => {
    const onOutsideClick = vi.fn();
    const { unmount } = render(<TestComponent onOutsideClick={onOutsideClick} />);
    const user = userEvent.setup();

    unmount();
    await user.click(document.body);

    expect(onOutsideClick).not.toHaveBeenCalled();
  });
});
