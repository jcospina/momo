import { Footer } from '@components/landing/footer/footer';
import { Logo } from '@ui/logo/logo';
import Link from 'next/link';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  isExternalHref,
  type LegalDocumentProps,
  readLegalMarkdown,
  resolveLegalMarkdownHref,
} from '@/lib/legal/documents';
import styles from './legal-document-page.module.css';

const markdownComponents: Components = {
  a({ href, children, ...props }) {
    const resolvedHref = resolveLegalMarkdownHref(href);
    const className = styles['momo-legal-doc__link'];

    if (!resolvedHref || resolvedHref.startsWith('#')) {
      return (
        <a className={className} href={resolvedHref} {...props}>
          {children}
        </a>
      );
    }

    if (isExternalHref(resolvedHref)) {
      return (
        <a
          className={className}
          href={resolvedHref}
          target="_blank"
          rel="noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <Link className={className} href={resolvedHref}>
        {children}
      </Link>
    );
  },
  table({ children }) {
    return (
      <div className={styles['momo-legal-doc__table-wrap']}>
        <table>{children}</table>
      </div>
    );
  },
};

export async function LegalDocumentPage({
  title,
  description,
  markdownPath,
}: LegalDocumentProps) {
  const markdown = await readLegalMarkdown(markdownPath);

  return (
    <div className={styles['momo-legal-doc']}>
      <header className={styles['momo-legal-doc__topbar']}>
        <div className={styles['momo-legal-doc__topbar-inner']}>
          <Link
            href="/"
            className={styles['momo-legal-doc__brand-link']}
            aria-label="Go to the MoMo landing page"
          >
            <Logo size="sm" />
          </Link>
          <div className={styles['momo-legal-doc__topbar-copy']}>
            <span className={styles['momo-legal-doc__eyebrow']}>
              Public document
            </span>
            <span className={styles['momo-legal-doc__topbar-title']}>
              {title}
            </span>
          </div>
        </div>
      </header>

      <main className={styles['momo-legal-doc__main']}>
        <div className={styles['momo-legal-doc__main-inner']}>
          {description ? (
            <p className={styles['momo-legal-doc__description']}>
              {description}
            </p>
          ) : null}

          <article className={styles['momo-legal-doc__surface']}>
            <div className={styles['momo-legal-doc__content']}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
