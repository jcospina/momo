'use client';

import { useMediaQuery } from '@hooks/use-media-query';
import { useTranslations } from 'next-intl';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Button } from '@/ui/button/button';
import { LeftIcon } from '@/ui/icons/left';

export type AuthLoginView = 'options' | 'form';

type AuthLoginPanelContextValue = {
  view: AuthLoginView;
  setView: (view: AuthLoginView) => void;
};

const AuthLoginPanelContext = createContext<AuthLoginPanelContextValue>({
  view: 'options',
  setView: () => {
    // no-op default for callers outside a provider (e.g. signup page)
  },
});

export function AuthLoginPanelProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AuthLoginView>('options');
  const value = useMemo<AuthLoginPanelContextValue>(
    () => ({ view, setView }),
    [view],
  );
  return (
    <AuthLoginPanelContext.Provider value={value}>
      {children}
    </AuthLoginPanelContext.Provider>
  );
}

export function useAuthLoginPanel() {
  return useContext(AuthLoginPanelContext);
}

export function AuthLoginBackButton() {
  const t = useTranslations('auth.login');
  const isWide = useMediaQuery('(min-width: 440px)');
  const { view, setView } = useAuthLoginPanel();

  const handleBack = useCallback(() => setView('options'), [setView]);

  if (isWide || view !== 'form') {
    return null;
  }

  return (
    <Button
      variant="icon"
      type="button"
      onClick={handleBack}
      aria-label={t('backAria')}
    >
      <LeftIcon width={24} height={24} />
    </Button>
  );
}
