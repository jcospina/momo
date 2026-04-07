'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useIsMobileLike } from '@/hooks/use-is-mobile-like';

import { Button } from '@/ui/button/button';

import { Flex } from '@/ui/flex/flex';
import styles from './profile.module.css';

type InviteLinkProps = {
  url: string;
};

type StatusCode = 'idle' | 'copied' | 'shared' | 'copy_failed';

export function InviteLink({ url }: InviteLinkProps) {
  const t = useTranslations('profile.invite');
  const isMobile = useIsMobileLike();
  const [status, setStatus] = useState<StatusCode>('idle');

  const statusText: Record<Exclude<StatusCode, 'idle'>, string> = {
    copied: t('linkCopied'),
    shared: t('shared'),
    copy_failed: t('copyFailed'),
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch (error) {
      console.error('share copy failed', error);
      setStatus('copy_failed');
    }
  }

  async function share() {
    if (!isMobile) {
      await copy();
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('shareTitle'),
          text: t('shareText'),
          url,
        });
        setStatus('shared');
        return;
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') {
          return;
        }
        console.error('share failed, falling back to copy', error);
      }
    }

    await copy();
  }

  useEffect(() => {
    if (status === 'idle') return;
    const id = setTimeout(() => setStatus('idle'), 2000);
    return () => clearTimeout(id);
  }, [status]);

  return (
    <Flex gap={2} alignItems="flex-start" direction="column">
      <Button variant="primary" type="button" onClick={share}>
        {isMobile ? t('share') : t('copy')}
      </Button>
      {status !== 'idle' ? (
        <div className={styles.status}>{statusText[status]}</div>
      ) : null}
    </Flex>
  );
}
