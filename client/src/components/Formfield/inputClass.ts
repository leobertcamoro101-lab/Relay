export const inputClass = (hasError?: boolean) =>
  `w-full bg-relay-surface border ${hasError ? 'border-red-500/50' : 'border-relay-border'}
   text-relay-ink text-sm rounded-xl px-3 py-2.5 outline-none
   focus:border-relay-accent transition-colors placeholder-relay-ink-subtle`;
