'use client';

import { cn } from '@utils/cn';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './momo-markdown.module.css';

type MomoMarkdownProps = {
  text: string;
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
      <div className={styles['momo-markdown__table-wrap']}>
        <table>{children}</table>
      </div>
    );
  },
};

export function MomoMarkdown({ text, className }: MomoMarkdownProps) {
  return (
    <div className={cn(styles['momo-markdown'], className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
