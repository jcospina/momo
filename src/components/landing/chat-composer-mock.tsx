'use client';

import { SendButton } from '@components/chat/send-button';
import { cn } from '@utils/cn';
import type { Ref } from 'react';
import styles from './chat-composer-mock.module.css';

type ChatComposerMockProps = {
  text: string;
  typedRef: Ref<HTMLSpanElement>;
  sendRef: Ref<HTMLSpanElement>;
  ready?: boolean;
  className?: string;
};

export function ChatComposerMock({
  text,
  typedRef,
  sendRef,
  ready,
  className,
}: ChatComposerMockProps) {
  return (
    <div className={cn(styles['momo-chat-composer-mock'], className)}>
      <span
        ref={typedRef}
        className={cn(
          styles['momo-chat-composer-mock__typed'],
          ready && styles['momo-chat-composer-mock__typed--ready'],
        )}
      >
        {text}
      </span>
      <span ref={sendRef} className={styles['momo-chat-composer-mock__send']}>
        <SendButton />
      </span>
    </div>
  );
}
