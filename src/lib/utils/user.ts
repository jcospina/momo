export function firstName(displayName: string | null, email: string | null) {
  if (displayName && displayName.trim()) {
    return displayName.trim().split(/\s+/)[0];
  }
  if (email) {
    return email.split('@')[0];
  }
  return 'Member';
}
