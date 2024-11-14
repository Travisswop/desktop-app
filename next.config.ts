import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
  },
};

export default nextConfig;
