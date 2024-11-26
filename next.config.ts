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
      'res.cloudinary.com',
    ], // Allow images from all domains
  },
};

export default nextConfig;
