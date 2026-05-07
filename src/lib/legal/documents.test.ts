import { readLegalMarkdown, resolveLegalMarkdownHref } from './documents';

describe('legal documents helpers', () => {
  it('reads the privacy markdown from the repo root', async () => {
    const markdown = await readLegalMarkdown('PRIVACY.md');

    expect(markdown).toContain('# Privacy Policy');
    expect(markdown).toContain('| Cookie | Purpose | Type | Lifetime |');
    expect(markdown).toContain(
      '[Google Account permissions page](https://myaccount.google.com/permissions)',
    );
  });

  it('rewrites markdown legal-doc links to public app routes', () => {
    expect(resolveLegalMarkdownHref('./PRIVACY.md')).toBe('/privacy');
    expect(resolveLegalMarkdownHref('./TERMS.md')).toBe('/terms');
    expect(resolveLegalMarkdownHref('https://example.com')).toBe(
      'https://example.com',
    );
  });
});
