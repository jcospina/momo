import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['sql.js'],
  outputFileTracingIncludes: {
    '/api/momo-stream': ['./node_modules/sql.js/dist/sql-wasm-inline.js'],
  },
};

export default withNextIntl(nextConfig);
