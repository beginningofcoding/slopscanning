import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
    ],
  },

  async redirects() {
    return [
      {
        source: '/repo/:owner/:name/scan',
        destination: '/repo/:owner/:name/code-review',
        permanent: true,
      },
      {
        source: '/repo/:owner/:name/prs',
        destination: '/repo/:owner/:name/pr-review',
        permanent: true,
      },
      {
        source: '/repo/:owner/:name/prs/:prNumber',
        destination: '/repo/:owner/:name/pr-review/:prNumber',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const backend =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://slopscanning.onrender.com';
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backend.replace(/\/$/, '')}/:path*`,
      },
    ];
  },
};

export default nextConfig;