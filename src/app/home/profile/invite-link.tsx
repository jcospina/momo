'use client';

import { useEffect, useState } from 'react';

import { Button } from '@components/button/button';

import { Flex } from '@components/flex/flex';
import styles from './profile.module.css';

type InviteLinkProps = {
  url: string;
};

export function InviteLink({ url }: InviteLinkProps) {
  const [status, setStatus] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Copied link');
    } catch (error) {
      console.error('share copy failed', error);
    }
  }

  async function share() {
    await copy();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my household on Momo',
          text: 'Use this link to join my household on MoMo.',
          url,
        });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') {
          return;
        }
        console.error('share failed, falling back to copy', error);
      }
    }
  }

  useEffect(() => {
    if (!status) return;
    const id = setTimeout(() => setStatus(null), 2000);
    return () => clearTimeout(id);
  }, [status]);

  return (
    <Flex gap={2} alignItems="center">
      <Button variant="primary" type="button" onClick={share}>
        Share invite link
      </Button>
      {status ? <div className={styles.status}>{status}</div> : null}
    </Flex>
  );
}
