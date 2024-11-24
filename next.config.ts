import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      '*',
      'i.seadn.io',
      'ipfs.io',
      'i.ibb.co',
      'nftstorage.link',
    ], // Allow images from all domains
  },
};

export default nextConfig;
