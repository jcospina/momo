export function isMobileLike() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const hasShare = typeof navigator.share === 'function';
  const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  return hasShare && isMobileUA;
}
