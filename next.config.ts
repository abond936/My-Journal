import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Large legacy lint surface; run `npm run lint` locally. Re-enable after cleanup.
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
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
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

export default nextConfig;
