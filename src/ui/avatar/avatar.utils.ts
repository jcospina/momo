export function getInitial(displayName: string | null) {
  const source = displayName?.trim();
  if (!source) return '?';
  return source.trim().charAt(0).toUpperCase();
}
