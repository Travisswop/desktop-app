import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Reduce memory usage in production
  productionBrowserSourceMaps: false,

  // Turbopack config (used by `next dev --turbopack`)
  // Mirrors the webpack resolve.fallback + resolve.alias below, which only
  // applies to production builds.
  turbopack: {
    resolveAlias: {
      // Node built-ins: let browser use native APIs (same as webpack crypto: false)
      fs: {},
      path: {},
      os: {},
      crypto: {},
      // Polyfills needed by @polymarket libs (no browser field)
      stream: "stream-browserify",
      buffer: "buffer",
      // Suppress optional peer dep warnings from ws/socket.io
      bufferutil: {},
      "utf-8-validate": {},
      // Suppress WASM loader stub
      wbg: {},
      // @metamask/sdk imports this React Native module in its browser build
      "@react-native-async-storage/async-storage": {},
    },
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "@radix-ui/react-icons",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "@solana/web3.js",
      "@solana/spl-token",
      "ethers",
      "date-fns",
      "lodash",
      "framer-motion",
      "recharts",
      "@lifi/widget",
      "@lifi/sdk",
    ],
    webpackMemoryOptimizations: true,
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config, { isServer }) => {
    // Polyfills: ethers v6 + @solana/web3.js use native Web Crypto API in browser
    // builds, so crypto-browserify is not needed. stream + buffer remain for
    // @polymarket libs which have no browser field.
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer"),
      };
    }

    // Clean alias (removed XMTP + WASM hacks)
    config.resolve.alias = {
      ...config.resolve.alias,
      wbg: false,
      bufferutil: false,
      "utf-8-validate": false,
      "@react-native-async-storage/async-storage": false,
    };

    return config;
  },

  images: {
    // Single wildcard allows any HTTPS host.
    // Token logos in the swap/bridge UI come from hundreds of arbitrary CDNs
    // (CoinGecko, TrustWallet, 1inch, backed.fi, prestocks.com, etc.) that
    // cannot be enumerated in advance — a whitelist approach causes constant
    // breakage as new tokens appear in LiFi routes.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      // Explicitly allow the internal asset host used in dev/preview
      { protocol: "http", hostname: "172.86.93.253" },
    ],
  },

  serverExternalPackages: [],
};

export default withBundleAnalyzer(nextConfig);
