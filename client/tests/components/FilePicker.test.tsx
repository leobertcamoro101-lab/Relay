import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Paperclip } from "lucide-react";
import FilePicker from "../../src/components/FilePicker";

function setup(props: Partial<React.ComponentProps<typeof FilePicker>> = {}) {
  const onPick = vi.fn();
  render(
    <FilePicker
      accept="image/*,.pdf"
      maxBytes={1024}
      label="Choose a file"
      icon={Paperclip}
      onPick={onPick}
      {...props}
    />
  );
  // applyAccept:false so rejected types still reach our own validation
  return { onPick, user: userEvent.setup({ applyAccept: false }) };
}

const file = (name: string, type: string, size = 10) =>
  new File([new Uint8Array(size)], name, { type });

describe("FilePicker", () => {
  it("calls onPick with the file when it passes", async () => {
    const { onPick, user } = setup();
    const f = file("a.png", "image/png");
    await user.upload(screen.getByLabelText("Choose a file"), f);
    expect(onPick).toHaveBeenCalledWith(f, "");
  });

  it("reports a type error", async () => {
    const { onPick, user } = setup();
    await user.upload(screen.getByLabelText("Choose a file"), file("a.exe", "application/x-msdownload"));
    expect(onPick).toHaveBeenCalledWith(null, expect.stringMatching(/supported file type/));
  });

  it("reports a size error", async () => {
    const { onPick, user } = setup();
    await user.upload(screen.getByLabelText("Choose a file"), file("a.png", "image/png", 4096));
    expect(onPick).toHaveBeenCalledWith(null, expect.stringMatching(/larger than/));
  });

  it("disables the input when disabled", () => {
    setup({ disabled: true });
    expect(screen.getByLabelText("Choose a file")).toBeDisabled();
  });
});
