import {
  NFTService,
  NFTAnalysisUtils,
} from '../services/nft-service.ts';

async function testNFTLogging() {
  console.log('🚀 Starting NFT logging test...\n');

  // Example Solana address (replace with a real address for testing)
  const testAddress = 'YOUR_SOLANA_ADDRESS_HERE';

  try {
    console.log(`📡 Fetching NFTs for address: ${testAddress}`);

    // Fetch NFTs with enhanced logging
    const nfts = await NFTService.getNFTsForChain(
      'solana',
      testAddress
    );

    console.log(`\n✅ Fetched ${nfts.length} NFTs successfully!`);

    if (nfts.length > 0) {
      // Analyze the NFTs
      console.log('\n📊 Running NFT analysis...');
      const analysis = NFTAnalysisUtils.analyzeNFTs(nfts);

      // Show timeline
      console.log('\n📅 NFT Timeline:');
      NFTAnalysisUtils.logNFTTimeline(nfts);

      // Show recent NFTs from last 30 days
      console.log('\n🆕 Recent NFTs (last 30 days):');
      const recentNFTs = NFTAnalysisUtils.getNFTsFromLastDays(
        nfts,
        30
      );
      console.log(
        `Found ${recentNFTs.length} NFTs from the last 30 days`
      );

      recentNFTs.forEach((nft, index) => {
        const date = new Date(nft.createdAt)
          .toISOString()
          .split('T')[0];
        console.log(`  ${index + 1}. ${nft.name} - Created: ${date}`);
      });
    } else {
      console.log('❌ No NFTs found for this address');
    }
  } catch (error) {
    console.error('❌ Error during NFT fetch:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testNFTLogging();
}

// Export for use in other modules
export { testNFTLogging };
