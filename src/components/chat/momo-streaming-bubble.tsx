'use client';

import { cn } from '@utils/cn';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './momo-streaming-bubble.module.css';

type MomoStreamingBubbleProps = {
  text: string;
  isComplete: boolean;
  className?: string;
};

// Collapse h1/h2/h3 to <h3> so the agent can't blow out the bubble with
// page-level display type. CSS in the module styles them at body-emphasis size.
const HeadingInBubble: Components['h3'] = ({ children }) => <h3>{children}</h3>;

const markdownComponents: Components = {
  h1: HeadingInBubble,
  h2: HeadingInBubble,
  h3: HeadingInBubble,
  a({ href, children, ...props }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className={styles['momo-streaming-bubble__table-wrap']}>
        <table>{children}</table>
      </div>
    );
  },
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
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {text}
          </ReactMarkdown>
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
