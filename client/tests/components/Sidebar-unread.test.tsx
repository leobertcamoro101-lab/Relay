import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import Sidebar from "../../src/pages/authenticated/Sidebar";

vi.mock("../../src/pages/authenticated/AccountMenu", () => ({
  default: () => <div data-testid="account-menu" />,
}));
vi.mock("../../src/pages/authenticated/UserSearch", () => ({
  default: () => <div data-testid="user-search" />,
}));

const conversations = [
  { roomId: "dm_a_b", otherUser: { id: "b", firstName: "Bea", lastName: "Bob", image: "" } },
  { roomId: "dm_a_c", otherUser: { id: "c", firstName: "Cy", lastName: "Cole", image: "" } },
];

function renderSidebar(overrides: Partial<ComponentProps<typeof Sidebar>> = {}) {
  return render(
    <Sidebar
      currentRoom="general"
      onlineCount={2}
      users={[{ id: "a", username: "Me" }, { id: "b", username: "Bea" }]}
      onSwitchRoom={vi.fn()}
      currentUser={{ id: "a", username: "Me" }}
      isOpen={false}
      onClose={vi.fn()}
      conversations={conversations}
      onStartConversation={vi.fn()}
      onDeleteConversation={vi.fn()}
      {...overrides}
    />
  );
}

const roomNames = () =>
  screen.getAllByRole("button").map((b) => b.textContent ?? "").filter((t) => t.startsWith("# "));

describe("Sidebar unread dots", () => {
  it("shows no dots when nothing is unread", () => {
    renderSidebar();
    expect(screen.queryByRole("img", { name: "Unread messages" })).not.toBeInTheDocument();
  });

  it("puts a dot on a room with unread messages", () => {
    renderSidebar({ unread: { tech: 2 } });
    const techButton = screen.getByRole("button", { name: /# tech/ });
    expect(within(techButton).getByRole("img", { name: "Unread messages" })).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /# general/ })).queryByRole("img")).toBeNull();
  });

  it("puts a dot on a DM with unread messages", () => {
    renderSidebar({ unread: { dm_a_c: 1 } });
    expect(screen.getAllByRole("img", { name: "Unread messages" })).toHaveLength(1);
  });

  it("also shows the dot next to that person in the online list", () => {
    renderSidebar({ unread: { dm_a_b: 1 } });
    // once in the DM list, once next to Bea under Online
    expect(screen.getAllByRole("img", { name: "Unread messages" })).toHaveLength(2);
  });
});

describe("Sidebar ordering by recent activity", () => {
  it("keeps the default order when there is no activity", () => {
    renderSidebar();
    expect(roomNames()).toEqual(["# general", "# tech", "# random"]);
  });

  it("moves rooms with newer activity to the top", () => {
    renderSidebar({ activity: { random: 300, tech: 200 } });
    expect(roomNames()).toEqual(["# random", "# tech", "# general"]);
  });

  it("moves the DM with the newest activity to the top of the DM list", () => {
    renderSidebar({ activity: { dm_a_c: 500 } });
    const dmLabels = screen.getAllByText(/Bea Bob|Cy Cole/).map((el) => el.textContent);
    expect(dmLabels[0]).toBe("Cy Cole");
  });
});
