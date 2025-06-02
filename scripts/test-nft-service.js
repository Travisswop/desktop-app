/**
 * Test script for NFT Service
 * Run with: node scripts/test-nft-service.js
 */

// Test wallet addresses (public, no private keys)
const TEST_ADDRESSES = {
  ethereum: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // Vitalik's address
  solana: 'tWigFz5vqnZqEjgbBFQMF7yKGdCVcYq8c5T4zPNgMLk', // Example Solana address
};

console.log('🚀 Testing NFT Service...\n');

// Test Alchemy API format
const testAlchemyAPI = async (network, address) => {
  console.log(`📡 Testing Alchemy API for ${network}...`);

  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_ETH_API_KEY;
  console.log('🚀 ~ testAlchemyAPI ~ apiKey:', apiKey);
  if (!apiKey) {
    console.log(`❌ No Alchemy API key found for ${network}`);
    return false;
  }

  try {
    const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner/?owner=${address}&withMetadata=true&pageSize=10`;
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(
        `✅ Alchemy API working - Found ${
          data.ownedNfts?.length || 0
        } NFTs`
      );
      return true;
    } else {
      console.log(
        `❌ Alchemy API failed: ${response.status} ${response.statusText}`
      );
      return false;
    }
  } catch (error) {
    console.log(`❌ Alchemy API error: ${error.message}`);
    return false;
  }
};

// Test Moralis API format
const testMoralisAPI = async (address) => {
  console.log(`📡 Testing Moralis API...`);

  const apiKey = process.env.NEXT_PUBLIC_MORALIS_API_KEY;
  if (!apiKey) {
    console.log(`❌ No Moralis API key found`);
    return false;
  }

  try {
    const url = `https://deep-index.moralis.io/api/v2.2/${address}/nft?chain=eth&format=decimal&limit=10`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-API-Key': apiKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(
        `✅ Moralis API working - Found ${
          data.result?.length || 0
        } NFTs`
      );
      return true;
    } else {
      console.log(
        `❌ Moralis API failed: ${response.status} ${response.statusText}`
      );
      return false;
    }
  } catch (error) {
    console.log(`❌ Moralis API error: ${error.message}`);
    return false;
  }
};

// Test Helius API format (Solana)
const testHeliusAPI = async (address) => {
  console.log(`📡 Testing Helius API for Solana...`);

  const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!apiKey) {
    console.log(`❌ No Helius API key found`);
    return false;
  }

  try {
    const requestBody = {
      jsonrpc: '2.0',
      id: 'test-get-assets-by-owner',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: address,
        page: 1,
        limit: 10,
      },
    };

    const response = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(
        `✅ Helius API working - Found ${
          data.result?.items?.length || 0
        } assets`
      );
      return true;
    } else {
      console.log(
        `❌ Helius API failed: ${response.status} ${response.statusText}`
      );
      return false;
    }
  } catch (error) {
    console.log(`❌ Helius API error: ${error.message}`);
    return false;
  }
};

// Test Shyft API format (Solana)
const testShyftAPI = async (address) => {
  console.log(`📡 Testing Shyft API for Solana...`);

  const apiKey = process.env.NEXT_PUBLIC_SHYFT_API_KEY;
  if (!apiKey) {
    console.log(`❌ No Shyft API key found`);
    return false;
  }

  try {
    const url = `https://api.shyft.to/sol/v1/nft/read_all?network=mainnet-beta&address=${address}`;
    const response = await fetch(url, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log(
          `✅ Shyft API working - Found ${
            data.result?.nfts?.length || 0
          } NFTs`
        );
        return true;
      } else {
        console.log(`❌ Shyft API returned error: ${data.message}`);
        return false;
      }
    } else {
      console.log(
        `❌ Shyft API failed: ${response.status} ${response.statusText}`
      );
      return false;
    }
  } catch (error) {
    console.log(`❌ Shyft API error: ${error.message}`);
    return false;
  }
};

// Main test function
const runTests = async () => {
  console.log('Environment variables check:');
  console.log(
    `ALCHEMY_ETH_API_KEY: ${
      process.env.NEXT_PUBLIC_ALCHEMY_ETH_API_KEY
        ? '✅ Set'
        : '❌ Missing'
    }`
  );
  console.log(
    `MORALIS_API_KEY: ${
      process.env.NEXT_PUBLIC_MORALIS_API_KEY
        ? '✅ Set'
        : '❌ Missing'
    }`
  );
  console.log(
    `HELIUS_API_KEY: ${
      process.env.NEXT_PUBLIC_HELIUS_API_KEY ? '✅ Set' : '❌ Missing'
    }`
  );
  console.log(
    `SHYFT_API_KEY: ${
      process.env.NEXT_PUBLIC_SHYFT_API_KEY ? '✅ Set' : '❌ Missing'
    }\n`
  );

  const results = [];

  // Test EVM providers
  results.push(
    await testAlchemyAPI('ethereum', TEST_ADDRESSES.ethereum)
  );
  results.push(await testMoralisAPI(TEST_ADDRESSES.ethereum));

  // Test Solana providers
  results.push(await testHeliusAPI(TEST_ADDRESSES.solana));
  results.push(await testShyftAPI(TEST_ADDRESSES.solana));

  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Working APIs: ${results.filter(Boolean).length}`);
  console.log(`❌ Failed APIs: ${results.filter((r) => !r).length}`);

  if (results.some(Boolean)) {
    console.log(
      '\n🎉 At least one API is working! NFT fetching should work with fallbacks.'
    );
  } else {
    console.log(
      '\n⚠️  No APIs are working. Please check your API keys and network connection.'
    );
  }
};

// Check if running in Node.js environment
if (typeof window === 'undefined') {
  // Load environment variables for Node.js
  import('dotenv').then((dotenv) => {
    dotenv.config({ path: '.env.local' });
    runTests().catch(console.error);
  });
} else {
  console.log(
    'Run this script with Node.js: node scripts/test-nft-service.js'
  );
}
