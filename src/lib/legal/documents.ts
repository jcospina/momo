import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type LegalDocumentProps = {
  title: string;
  markdownPath: string;
  description?: string;
};

const LEGAL_ROUTE_BY_MARKDOWN_PATH: Record<string, string> = {
  'PRIVACY.MD': '/privacy',
  'TERMS.MD': '/terms',
};

export async function readLegalMarkdown(markdownPath: string) {
  return readFile(path.join(process.cwd(), markdownPath), 'utf8');
}

export function resolveLegalMarkdownHref(href?: string | null) {
  if (!href) {
    return undefined;
  }

  const normalizedHref = href.replace(/\\/g, '/');
  const normalizedPath = normalizedHref.replace(/^\.?\//, '').toUpperCase();
  const legalRoute = LEGAL_ROUTE_BY_MARKDOWN_PATH[normalizedPath];

  return legalRoute ?? href;
}

export function isExternalHref(href: string) {
  return /^(https?:|mailto:|tel:)/i.test(href);
}
