'use client';

import { cn } from '@utils/cn';
import { MomoMarkdown } from './momo-markdown';
import styles from './momo-streaming-bubble.module.css';

type MomoStreamingBubbleProps = {
  text: string;
  /**
   * Reserved for future use. Currently unread — the avatar + arriving
   * tokens convey "in progress" sufficiently, so the trailing caret was
   * removed. Kept on the type so callers can continue passing it without
   * a churn-y signature change.
   */
  isComplete?: boolean;
  className?: string;
};

export function MomoStreamingBubble({
  text,
  className,
}: MomoStreamingBubbleProps) {
  return (
    <div className={cn(styles['momo-streaming-bubble'], className)}>
      <article className={styles['momo-streaming-bubble__message']}>
        <div className={styles['momo-streaming-bubble__content']}>
          <MomoMarkdown text={text} />
        </div>
      </article>
    </div>
  );
}
