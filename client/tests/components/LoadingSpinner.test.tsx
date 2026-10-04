import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import LoadingSpinner from "../../src/components/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders just the spinner, with no overlay wrapper, by default", () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.className).toBe("");
    expect(wrapper.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders a full-page overlay wrapper when asOverlay is true", () => {
    const { container } = render(<LoadingSpinner asOverlay />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.className).toContain("absolute");
    expect(wrapper.className).toContain("top-0");
    expect(wrapper.className).toContain("left-0");
    expect(wrapper.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
