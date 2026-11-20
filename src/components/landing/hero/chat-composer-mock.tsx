'use client';

import { SendIcon } from '@ui/icons/send';
import { cn } from '@utils/cn';
import type { Ref } from 'react';
import styles from './chat-composer-mock.module.css';

type ChatComposerMockProps = {
  text: string;
  /** Shown while nothing is typed, like the chat's composer. */
  placeholder?: string;
  typedRef?: Ref<HTMLSpanElement>;
  sendRef?: Ref<HTMLSpanElement>;
  ready?: boolean;
  className?: string;
};

/** A still picture of the chat composer; text is typed in by the caller. */
export function ChatComposerMock({
  text,
  placeholder,
  typedRef,
  sendRef,
  ready,
  className,
}: ChatComposerMockProps) {
  return (
    <div className={cn(styles['momo-chat-composer-mock'], className)}>
      <span
        ref={typedRef}
        data-placeholder={placeholder}
        className={cn(
          styles['momo-chat-composer-mock__typed'],
          ready && styles['momo-chat-composer-mock__typed--ready'],
        )}
      >
        {text}
      </span>
      <span ref={sendRef} className={styles['momo-chat-composer-mock__send']}>
        <SendIcon width={18} height={18} />
      </span>
    </div>
  );
}
