import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  turbopack: {},
  serverExternalPackages: [
    '@sentry/nextjs',
    'pg',
    'web-push',
    'agentmail',
    'grammy',
    'sharp',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'sonner',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:lang/roadmap',
        destination: '/:lang/features',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/community-management', destination: '/en/community-management' },
      { source: '/ngo-management', destination: '/en/ngo-management' },
      { source: '/organization-management', destination: '/en/organization-management' },
      { source: '/grassroots-organizing', destination: '/en/grassroots-organizing' },
      { source: '/campaign-management', destination: '/en/campaign-management' },
      { source: '/member-management', destination: '/en/member-management' },
      { source: '/collective-decision-making', destination: '/en/collective-decision-making' },
      { source: '/verify/:slug/:id', destination: '/en/verify/:slug/:id' },
      { source: '/members/badge', destination: '/en/members/badge' },
      { source: '/sangathan-vs-whatsapp', destination: '/en/sangathan-vs-whatsapp' },
      { source: '/sangathan-vs-nationbuilder', destination: '/en/sangathan-vs-nationbuilder' },
      { source: '/sangathan-vs-action-network', destination: '/en/sangathan-vs-action-network' },
    ];
  },
};

const hasSentryAuth = Boolean(process.env.SENTRY_AUTH_TOKEN);

const configWithSerwist = withSerwist(nextConfig);

export default hasSentryAuth
  ? withSentryConfig(configWithSerwist, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      widenClientFileUpload: Boolean(process.env.SENTRY_WIDEN_UPLOAD === 'true'),
      tunnelRoute: "/monitoring",
      sourcemaps: {
        disable: false,
      },
    })
  : configWithSerwist;

