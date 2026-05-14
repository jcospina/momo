'use client';

import { cn } from '@utils/cn';
import { MomoMarkdown } from './momo-markdown';
import styles from './momo-streaming-bubble.module.css';

type MomoStreamingBubbleProps = {
  text: string;
  isComplete: boolean;
  className?: string;
};

export function MomoStreamingBubble({
  text,
  isComplete,
  className,
}: MomoStreamingBubbleProps) {
  return (
    <div className={cn(styles['momo-streaming-bubble'], className)}>
      <article className={styles['momo-streaming-bubble__message']}>
        <div className={styles['momo-streaming-bubble__content']}>
          <MomoMarkdown text={text} />
          {!isComplete ? (
            <span
              aria-hidden="true"
              data-testid="momo-streaming-bubble-caret"
              className={styles['momo-streaming-bubble__caret']}
            />
          ) : null}
        </div>
      </article>
    </div>
  );
}
