import { LegalDocumentPage } from '@components/legal/legal-document-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How MoMo collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      description="How MoMo collects, uses, shares, and protects your information."
      markdownPath="PRIVACY.md"
    />
  );
}
