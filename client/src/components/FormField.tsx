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

  // Associate the label with its field via htmlFor/id so screen readers
  // announce them together and clicking the label focuses the field.
  // FormField is always used with a single input/select child, so we can
  // inject an id centrally here instead of hand-adding one at every call
  // site — respecting an id the caller already set, if any.
  const isField = isValidElement<{ id?: string }>(children);
  const fieldId = isField ? (children.props.id ?? generatedId) : undefined;
  const field = isField ? cloneElement(children, { id: fieldId }) : children;

  return (
    <div>
      <label htmlFor={fieldId} className="text-xs text-gray-400 mb-1 block font-medium">
        {label}
      </label>
      {field}
      {hint && !error && <p className="text-gray-600 text-xs mt-1">{hint}</p>}
      {error && <p className="text-red-400 text-xs mt-1">⚠️ {error.message}</p>}
    </div>
  );
};

// export const inputClass = (hasError?: boolean) =>
//   `w-full bg-gray-900 border ${hasError ? 'border-red-500/50' : 'border-gray-700'}
//    text-white text-sm rounded-xl px-3 py-2.5 outline-none
//    focus:border-violet-400 transition-colors placeholder-gray-600`;

export default FormField;
