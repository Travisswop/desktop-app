import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https", // Allow any protocol
        hostname: "*", // Allow any hostname
      },
      {
        protocol: "http", // Allow any protocol
        hostname: "*", // Allow any hostname
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    domains: [
      "*",
      "i.seadn.io",
      "ipfs.io",
      "i.ibb.co",
      "nftstorage.link",
      "res.cloudinary.com",
    ], // Allow images from all domains
  },
};

export default nextConfig;
