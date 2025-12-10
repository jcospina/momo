'use client';

import { useIsMobileLike } from '@/hooks/use-is-mobile-like';
import { useEffect, useState } from 'react';

import { Button } from '@/ui/button/button';

import { Flex } from '@/ui/flex/flex';
import styles from './profile.module.css';

type InviteLinkProps = {
  url: string;
};

type StatusCode = 'idle' | 'copied' | 'shared' | 'copy_failed';

const STATUS_TEXT: Record<Exclude<StatusCode, 'idle'>, string> = {
  copied: 'Link copied',
  shared: 'Shared!',
  copy_failed: 'Copy failed',
};

export function InviteLink({ url }: InviteLinkProps) {
  const isMobile = useIsMobileLike();
  const [status, setStatus] = useState<StatusCode>('idle');

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
          title: 'Join my household on MoMo',
          text: 'Use this link to join my household on MoMo.',
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
        {isMobile ? 'Share' : 'Copy'} invite link
      </Button>
      {status !== 'idle' ? (
        <div className={styles.status}>{STATUS_TEXT[status]}</div>
      ) : null}
    </Flex>
  );
}
