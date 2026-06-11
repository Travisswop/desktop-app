export type MintCategory = 'physical' | 'digital';

export interface MintCollection {
  _id: string;
  name: string;
  displayName: string;
  address: string;
  image: string;
  description: string;
  category: MintCategory;
}

export const MINT_COLLECTIONS: MintCollection[] = [
  {
    _id: '67c68cb5a98b77809109710b',
    name: 'phygital',
    displayName: 'Products',
    address: 'EFNUeHdd9dYNWaczMGfCtqThFea7HcL7xUdH8QNsYUcq',
    image:
      'https://husky-peach-bear.myfilebase.com/ipfs/QmfWYYueYHxXwBRT829avEN8JBWM6HcsXzYkjJ4CdHLy8W',
    description:
      'Tangible items shipped to buyers, paired with a digital receipt. Best for physical merchandise, signed goods, and limited drops that combine real-world ownership with on-chain provenance.',
    category: 'physical',
  },
  {
    _id: '67c68c4fa98b778091097109',
    name: 'menu',
    displayName: 'Menus',
    address: '9rEJ9F2XoTsYyb69AftEqdJPU7jNKiTWb9AHrWFpVX3H',
    image:
      'https://husky-peach-bear.myfilebase.com/ipfs/QmNo8Tqrms1LLEPmwkVv3grjgn7D6ohm58VgYb7zfgHkH3',
    description:
      'Sell prepared food and beverage items from a restaurant, café, or pop-up. Each menu item is fulfilled in person while the NFT keeps a verifiable record of the order.',
    category: 'physical',
  },
  {
    _id: '67c68ac5a98b778091097101',
    name: 'collectible',
    displayName: 'Collectibles',
    address: 'GWDcKu6dqd5wnFftkDPBmd8cNwhJRFgtWod6veALFio7',
    image:
      'https://husky-peach-bear.myfilebase.com/ipfs/QmPHsbPDX3hiPoQGNSCcrA4toy2H9aZkDv2HDriVZU1dQa',
    description:
      'Unique digital assets your audience can own, trade, and showcase. Great for art drops, badges, and community keepsakes.',
    category: 'digital',
  },
  {
    _id: '67c68b2aa98b778091097103',
    name: 'subscription',
    displayName: 'Subscriptions',
    address: '8oZbcawBRjtfaYHHtvdDRWXWRGo6foSMThuSmsMCzC94',
    image:
      'https://husky-peach-bear.myfilebase.com/ipfs/QmaKJkGp9JdTKAwenqfD6QWBkgoXX3eo8Z4fZfiNpnequb',
    description:
      'Recurring access passes that unlock content, perks, or services for as long as the subscription is active.',
    category: 'digital',
  },
  {
    _id: '67c68b8fa98b778091097105',
    name: 'membership',
    displayName: 'Memberships',
    address: '2vawHME3K5L2Q46XzfT7pEww5pZvmLrQCdXNiXrENzB1',
    image:
      'https://husky-peach-bear.myfilebase.com/ipfs/QmZK8ZNsnFVc9WCoMhLs33u8W1fJ9c4cmtBkUepEV4n5yc',
    description:
      'One-time purchase passes that grant lasting access to private channels, gated drops, or community events.',
    category: 'digital',
  },
  {
    _id: '67c68bdca98b778091097107',
    name: 'coupon',
    displayName: 'Coupons',
    address: '1nukwBi7Xb4PdY7wbgaT22kuVP85m3vbFojeKzCGsKY',
    image:
      'https://husky-peach-bear.myfilebase.com/ipfs/QmRJdcUtsQnJRsAKtvTxfpTTgouSHNHXL7kzA4Zme1xiHY',
    description:
      'Redeemable discount vouchers your customers can collect, trade, or apply at checkout.',
    category: 'digital',
  },
];

export const PHYSICAL_COLLECTIONS = MINT_COLLECTIONS.filter(
  (c) => c.category === 'physical'
);

export const DIGITAL_COLLECTIONS = MINT_COLLECTIONS.filter(
  (c) => c.category === 'digital'
);
