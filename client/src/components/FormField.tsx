import type { FieldError } from 'react-hook-form';

interface FormFieldProps {
  label: string;
  error?: FieldError;
  hint?: string;
  children: React.ReactNode;
}

const FormField = ({ label, error, hint, children }: FormFieldProps) => (
  <div>
    <label className="text-xs text-gray-400 mb-1 block font-medium">{label}</label>
    {children}
    {hint && !error && <p className="text-gray-600 text-xs mt-1">{hint}</p>}
    {error && <p className="text-red-400 text-xs mt-1">⚠️ {error.message}</p>}
  </div>
);

// export const inputClass = (hasError?: boolean) =>
//   `w-full bg-gray-900 border ${hasError ? 'border-red-500/50' : 'border-gray-700'}
//    text-white text-sm rounded-xl px-3 py-2.5 outline-none
//    focus:border-violet-400 transition-colors placeholder-gray-600`;

export default FormField;
