import { useSyncExternalStore } from 'react';

import { isMobileLike } from '@utils/is-mobile';

const getServerSnapshot = () => false;

const getSnapshot = () =>
  typeof window === 'undefined' ? false : isMobileLike();

const subscribe = () => () => {};

export function useIsMobileLike() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
