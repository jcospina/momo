/**
 * Extract the uppercase first character of a display name.
 *
 * Returns `'?'` when the input is `null`, empty, or whitespace-only.
 */
export function getInitial(displayName: string | null) {
  const source = displayName?.trim();
  if (!source) return '?';
  return source.trim().charAt(0).toUpperCase();
}
