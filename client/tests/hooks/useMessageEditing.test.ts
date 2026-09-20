import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMessageEditing } from "../../src/hooks/useMessageEditing";

describe("useMessageEditing", () => {
  it("starts with no message being edited", () => {
    const { result } = renderHook(() => useMessageEditing(vi.fn()));
    expect(result.current.editingId).toBeNull();
    expect(result.current.editText).toBe("");
  });

  it("startEdit loads the message's id and text into the draft", () => {
    const { result } = renderHook(() => useMessageEditing(vi.fn()));

    act(() => result.current.startEdit({ id: "m1", text: "hello" }));

    expect(result.current.editingId).toBe("m1");
    expect(result.current.editText).toBe("hello");
  });

  it("startEdit does nothing for a message with no id (e.g. a SYSTEM message)", () => {
    const { result } = renderHook(() => useMessageEditing(vi.fn()));

    act(() => result.current.startEdit({ text: "system notice" }));

    expect(result.current.editingId).toBeNull();
  });

  it("cancelEdit clears the draft without calling onEditMessage", () => {
    const onEditMessage = vi.fn();
    const { result } = renderHook(() => useMessageEditing(onEditMessage));
    act(() => result.current.startEdit({ id: "m1", text: "hello" }));

    act(() => result.current.cancelEdit());

    expect(result.current.editingId).toBeNull();
    expect(result.current.editText).toBe("");
    expect(onEditMessage).not.toHaveBeenCalled();
  });

  it("saveEdit trims the text and calls onEditMessage, then clears the draft", () => {
    const onEditMessage = vi.fn();
    const { result } = renderHook(() => useMessageEditing(onEditMessage));
    act(() => result.current.startEdit({ id: "m1", text: "hello" }));
    act(() => result.current.setEditText("  updated text  "));

    act(() => result.current.saveEdit("m1"));

    expect(onEditMessage).toHaveBeenCalledWith("m1", "updated text");
    expect(result.current.editingId).toBeNull();
    expect(result.current.editText).toBe("");
  });

  it("saveEdit does not call onEditMessage when the draft is empty/whitespace-only", () => {
    const onEditMessage = vi.fn();
    const { result } = renderHook(() => useMessageEditing(onEditMessage));
    act(() => result.current.startEdit({ id: "m1", text: "hello" }));
    act(() => result.current.setEditText("   "));

    act(() => result.current.saveEdit("m1"));

    expect(onEditMessage).not.toHaveBeenCalled();
    expect(result.current.editingId).toBeNull(); // still clears editing state either way
  });
});
