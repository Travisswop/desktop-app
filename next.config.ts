import type { NextConfig } from 'next';

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
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
      };
    }

    // Enable WebAssembly
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };

    // Add WASM file loader
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // Completely exclude problematic packages from server-side bundling
    if (isServer) {
      const originalExternals = config.externals || [];
      config.externals = [
        ...originalExternals,
        // XMTP packages
        '@xmtp/browser-sdk',
        '@xmtp/wasm-bindings',
        '@xmtp/proto',
        // Other problematic client-only packages
        'crypto-browserify',
        'stream-browserify',
        'buffer',
      ];
    }

    // Fix for wbg issue and other problematic imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'wbg': false,
    };

    return config;
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
        hostname: '**',
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
      {
        protocol: 'https',
        hostname: 'cryptologos.cc',
      },
    ],
  },
  serverExternalPackages: ['@xmtp/user-preferences-bindings-wasm'],
};

export default nextConfig; 