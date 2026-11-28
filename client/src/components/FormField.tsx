import { cloneElement, isValidElement, useId } from 'react';
import type { FieldError } from 'react-hook-form';

interface FormFieldProps {
  label: string;
  error?: FieldError;
  hint?: string;
  children: React.ReactNode;
}

const FormField = ({ label, error, hint, children }: FormFieldProps) => {
  const generatedId = useId();
  const errorId = useId();

  // Associate the label with its field via htmlFor/id so screen readers
  // announce them together and clicking the label focuses the field.
  // FormField is always used with a single input/select child, so we can
  // inject an id centrally here instead of hand-adding one at every call
  // site — respecting an id the caller already set, if any.
  const isField = isValidElement<{ id?: string }>(children);
  const fieldId = isField ? (children.props.id ?? generatedId) : undefined;
  const field = isField
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: fieldId,
        ...(error ? { 'aria-invalid': true, 'aria-describedby': errorId } : {}),
      })
    : children;

  return (
    <div>
      <label htmlFor={fieldId} className="text-xs text-relay-ink-subtle mb-1 block font-medium">
        {label}
      </label>
      {field}
      {hint && !error && <p className="text-relay-ink-subtle text-xs mt-1">{hint}</p>}
      {error && (
        <p id={errorId} className="text-red-600 text-xs mt-1">
          <span aria-hidden="true">⚠️</span> {error.message}
        </p>
      )}
    </div>
  );
};

export default FormField;
