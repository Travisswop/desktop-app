import type { NextConfig } from 'next';

const cspValue =
  process.env.NODE_ENV === 'production'
    ? [
        "default-src 'self'",
        "script-src 'self' https://challenges.cloudflare.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        'child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org',
        'frame-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com',
        "connect-src 'self' https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems",
        "worker-src 'self'",
        "manifest-src 'self'",
      ]
        .join('; ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    : ["default-src 'self'", "img-src 'self' data: blob:"]
        .join('; ')
        .replace(/\s{2,}/g, ' ')
        .trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors:
      process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === 'true',
  },
  eslint: {
    ignoreDuringBuilds:
      process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === 'true',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
      {
        protocol: 'http',
        hostname: '*',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'nftstorage.link',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'i.seadn.io',
      },
    ],
  },
  serverExternalPackages: ['@xmtp/user-preferences-bindings-wasm'],

  // Add Privy Content Security Policy configuration for App Router
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         {
  //           key: 'Content-Security-Policy',
  //           value: cspValue,
  //         },
  //       ],
  //     },
  //   ];
  // },
};

export default nextConfig;
