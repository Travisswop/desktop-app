import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const isLowMemory = process.env.LOW_MEMORY_MODE === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Disable source maps in production to reduce memory usage
  productionBrowserSourceMaps: false,

  // Optimize package imports to reduce bundle size and memory usage
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "@solana/web3.js",
      "@solana/spl-token",
      "ethers",
      "date-fns",
      "lodash",
    ],
    // Enable webpack memory optimizations for large builds
    webpackMemoryOptimizations: true,
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  typescript: {
    // Skip type checking during build to reduce memory usage
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip linting during build to reduce memory usage
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer"),
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
      type: "asset/resource",
    });

    // Completely exclude problematic packages from server-side bundling
    if (isServer) {
      const originalExternals = config.externals || [];
      config.externals = [
        ...originalExternals,
        // Other problematic client-only packages
        "crypto-browserify",
        "stream-browserify",
        "buffer",
      ];
    }

    // Fix for wbg issue and other problematic imports
    config.resolve.alias = {
      ...config.resolve.alias,
      wbg: false,
    };

    // Additional optimization for XMTP WASM handling
    config.module.rules.push({
      test: /node_modules\/@xmtp\/.*\.js$/,
      type: "javascript/auto",
    });

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
      {
        protocol: "http",
        hostname: "*",
      },
      {
        protocol: "http",
        hostname: "**", // Allows all HTTP domains (less secure)
      },
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "media0.giphy.com",
      },
      {
        protocol: "https",
        hostname: "**.giphy.com",
      },
      {
        protocol: "https",
        hostname: "app.apiswop.co",
      },
      {
        protocol: "https",
        hostname: "nftstorage.link",
      },
      {
        protocol: "https",
        hostname: "i.ibb.co",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
      },
      {
        protocol: "https",
        hostname: "i.seadn.io",
      },
      {
        protocol: "https",
        hostname: "cryptologos.cc",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com", // YouTube thumbnails
      },
      {
        protocol: "https",
        hostname: "**.youtube.com",
      },
      {
        protocol: "https",
        hostname: "**.googlevideo.com",
      },
      {
        protocol: "https",
        hostname: "**.twitter.com",
      },
      {
        protocol: "https",
        hostname: "**.twimg.com",
      },
      {
        protocol: "https",
        hostname: "**.githubusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob: https://res.cloudinary.com",
              "media-src 'self' https://res.cloudinary.com", // Add this line!
              "font-src 'self' data:",
              "connect-src 'self' https://res.cloudinary.com",
              "frame-src 'self'",
            ]
              .filter(Boolean)
              .join("; "),
          },
        ],
      },
    ];
  },
  serverExternalPackages: [],
};

export default nextConfig;
