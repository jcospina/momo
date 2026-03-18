import { isMobileLike } from '@utils/is-mobile';
import { useSyncExternalStore } from 'react';

const getServerSnapshot = () => false;

const getSnapshot = () =>
  typeof window === 'undefined' ? false : isMobileLike();

const subscribe = () => () => {
  // noop: mobile-like snapshot has no event source
};

export function useIsMobileLike() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
