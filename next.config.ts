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
        // Add additional fallbacks for XMTP
        path: false,
        os: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
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
        // XMTP packages - prevent server-side execution
        '@xmtp/browser-sdk',
        '@xmtp/wasm-bindings',
        '@xmtp/proto',
        '@xmtp/user-preferences-bindings-wasm',
        '@xmtp/content-type-primitives',
        '@xmtp/content-type-text',
        '@xmtp/content-type-reaction',
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

    // Additional optimization for XMTP WASM handling
    config.module.rules.push({
      test: /node_modules\/@xmtp\/.*\.js$/,
      type: 'javascript/auto',
    });

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
  serverExternalPackages: [
    '@xmtp/user-preferences-bindings-wasm',
    '@xmtp/browser-sdk',
    '@xmtp/wasm-bindings',
    '@xmtp/proto',
  ],
};

export default nextConfig; 