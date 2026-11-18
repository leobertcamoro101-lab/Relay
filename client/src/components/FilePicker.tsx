import type { ChangeEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { validateFile } from "../utils/attachments";

interface FilePickerProps {
  /** <input accept>-style list: MIME patterns, exact types and/or ".ext" */
  accept: string;
  maxBytes: number;
  /** The file input's accessible name */
  label: string;
  /** Tooltip; defaults to label */
  title?: string;
  icon: LucideIcon;
  iconSize?: number;
  disabled?: boolean;
  className?: string;
  /**
   * Called with the file when it passes the type and size checks, otherwise
   * with null and the message to show.
   */
  onPick: (file: File | null, error: string) => void;
}

/**
 * An icon-only "choose file" button. The real <input type="file"> stays in
 * the page (visually hidden) so it can be tabbed to; the ring shows on the
 * button. Validates type and size so callers don't repeat that.
 */
const FilePicker = ({
  accept,
  maxBytes,
  label,
  title,
  icon: Icon,
  iconSize = 20,
  disabled = false,
  className = "",
  onPick,
}: FilePickerProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again after a rejection or removal
    if (!picked) return;

    const error = validateFile(picked, { accept, maxBytes });
    if (error) onPick(null, error);
    else onPick(picked, "");
  };

  return (
    <label
      title={title ?? label}
      className={`inline-flex cursor-pointer items-center justify-center rounded-md
                  has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-relay-accent
                  has-[:focus-visible]:ring-offset-2 has-[:disabled]:cursor-not-allowed
                  has-[:disabled]:opacity-50 ${className}`}
    >
      <Icon size={iconSize} />
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        aria-label={label}
        onChange={handleChange}
        className="sr-only"
      />
    </label>
  );
};

export default FilePicker;
