/** Type-guard that returns `true` when `value` is a non-blank string. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
