import { LegalDocumentPage } from '@components/legal/legal-document-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The rules and limits for using MoMo.',
};

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="Terms of Service"
      description="The terms that govern your access to and use of MoMo."
      markdownPath="TERMS.md"
    />
  );
}
