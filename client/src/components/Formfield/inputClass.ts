export const inputClass = (hasError?: boolean) =>
  `w-full bg-gray-900 border ${hasError ? 'border-red-500/50' : 'border-gray-700'}
   text-white text-sm rounded-xl px-3 py-2.5 outline-none
   focus:border-violet-400 transition-colors placeholder-gray-600`;