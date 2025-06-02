# NFT Service Configuration Guide

## Overview

The NFT service has been completely rewritten to provide robust NFT fetching capabilities with multiple API providers and automatic failover mechanisms. This ensures that NFT data can be retrieved even if one provider is down or rate-limited.

## Features

- **Multiple API Providers**: Uses different providers for better reliability
- **Automatic Failover**: If one provider fails, automatically tries the next
- **Better Error Handling**: More descriptive errors and proper error propagation
- **Spam Filtering**: Filters out spam/scam NFTs automatically
- **Cross-chain Support**: Supports Ethereum, Polygon, Base, Sepolia, and Solana

## API Providers

### EVM Chains (Ethereum, Polygon, Base, Sepolia)

1. **Alchemy** (Primary)
   - Most reliable and feature-rich
   - Provides spam detection
   - Rate limits: Varies by plan

2. **Moralis** (Fallback)
   - Cross-chain support
   - Normalized metadata
   - Rate limits: Varies by plan

### Solana

1. **Helius** (Primary)
   - Metaplex DAS API
   - Compressed NFT support
   - Rate limits: Varies by plan

2. **QuickNode** (Fallback)
   - qn_fetchNFTs method
   - Fast response times
   - Rate limits: Varies by plan

3. **Shyft** (Second Fallback)
   - Simple REST API
   - Good metadata coverage
   - Rate limits: 100 requests/minute (free)

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Alchemy API Keys (Primary NFT provider for EVM chains)
NEXT_PUBLIC_ALCHEMY_ETH_API_KEY=your_alchemy_ethereum_api_key
NEXT_PUBLIC_ALCHEMY_POLYGON_API_KEY=your_alchemy_polygon_api_key
NEXT_PUBLIC_ALCHEMY_BASE_API_KEY=your_alchemy_base_api_key
NEXT_PUBLIC_ALCHEMY_SEPOLIA_API_KEY=your_alchemy_sepolia_api_key

# Moralis API Key (Fallback for EVM chains)
NEXT_PUBLIC_MORALIS_API_KEY=your_moralis_api_key

# Solana NFT API Keys (Multiple providers)
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key
NEXT_PUBLIC_QUICKNODE_API_KEY=your_quicknode_api_key
NEXT_PUBLIC_SHYFT_API_KEY=your_shyft_api_key
```

## Getting API Keys

### Alchemy
1. Go to [Alchemy](https://www.alchemy.com/)
2. Create an account and project
3. Copy the API key from your dashboard
4. Create separate projects for each network

### Moralis
1. Sign up at [Moralis](https://moralis.io/)
2. Create a new project
3. Get your API key from Web3 APIs section

### Helius
1. Visit [Helius](https://www.helius.dev/)
2. Create an account
3. Get your API key from the dashboard

### QuickNode
1. Go to [QuickNode](https://www.quicknode.com/)
2. Create a Solana endpoint
3. Enable NFT API add-on
4. Use the endpoint URL as your API key

## Usage

The service automatically handles failover between providers. You don't need to change your existing code - the `useNFT` hook will automatically use the new service.

```typescript
const { nfts, loading, error, refetch } = useNFT(
  solanaAddress,
  evmAddress,
  ['ETHEREUM', 'POLYGON', 'SOLANA']
);
```

## Error Handling

The service now provides better error messages:

- Individual provider failures are logged as warnings
- Only throws errors if ALL providers fail
- Errors include provider-specific details
- Empty arrays are considered valid responses

## Performance Improvements

- **Caching**: 5-minute stale time, 10-minute garbage collection
- **Retry Logic**: 2 retries with 1-second delay
- **Parallel Queries**: Multiple chains fetched simultaneously
- **Filtering**: Spam and invalid NFTs filtered out

## Troubleshooting

### No NFTs Loading
1. Check if API keys are set correctly
2. Verify wallet addresses are valid
3. Check network connectivity
4. Look at browser console for error details

### Slow Loading
1. Some providers may be rate-limited
2. Try refreshing to hit different providers
3. Consider upgrading API plans for better rate limits

### Missing NFTs
1. Different providers may have different coverage
2. Spam filtering might be too aggressive
3. Check if NFTs are on supported networks

## Rate Limiting

The service respects rate limits by:
- Using multiple providers to distribute load
- Implementing proper retry logic
- Caching responses to reduce API calls
- Providing meaningful error messages when limits are hit

## Security Notes

- API keys are exposed in frontend (NEXT_PUBLIC_*)
- Use rate-limited/restricted keys when possible
- Monitor API usage to prevent abuse
- Consider implementing backend proxy for sensitive keys