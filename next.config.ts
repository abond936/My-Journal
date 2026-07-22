import path from "path";
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { withSentryConfig } from "@sentry/nextjs";

loadEnvConfig(path.resolve(__dirname));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // Large legacy lint surface; run `npm run lint` locally. Re-enable after cleanup.
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  transpilePackages: ['@tiptap/html', 'zeed-dom'],
  // Keep ExifTool packages as runtime Node externals (not bundled by webpack).
  // Card/media read routes no longer import this graph; the import-side routes
  // (`/api/import/*`, `/api/images/local/import`, `/api/images/browser`) load it
  // at runtime. Silences `Module not found: 'exiftool-vendored.pl'` on platforms
  // where the optional Perl-side platform package is not installed (Windows dev).
  serverExternalPackages: ['exiftool-vendored', 'exiftool-vendored.pl'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/admin/card-admin/:id/edit',
        destination: '/admin/studio?card=:id',
        permanent: true,
      },
      {
        source: '/admin/card-admin/new',
        destination: '/admin/studio?new=1',
        permanent: true,
      },
      {
        source: '/admin/card-admin/:id',
        destination: '/admin/studio?card=:id',
        permanent: true,
      },
      {
        source: '/admin/card-admin',
        destination: '/admin/studio',
        permanent: true,
      },
      {
        source: '/admin/media-admin',
        destination: '/admin/studio',
        permanent: true,
      },
      {
        source: '/admin/tag-admin',
        destination: '/admin/studio',
        permanent: true,
      },
      {
        source: '/admin/question-admin',
        destination: '/admin/studio',
        permanent: true,
      },
      {
        source: '/admin/collections',
        destination: '/admin/studio',
        permanent: true,
      },
      {
        source: '/admin/media-triage',
        destination: '/admin/studio',
        permanent: true,
      },
      {
        source: '/admin/admin-triage',
        destination: '/admin/studio',
        permanent: false,
      },
      {
        source: '/admin/triage',
        destination: '/admin/studio',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
    ];
  },
};

const sentryWebpackPluginEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  tunnelRoute: '/monitoring',
  sourcemaps: {
    disable: !sentryWebpackPluginEnabled,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: false,
  },
});

