# Multi-Chain Swap Implementation Guide

This document outlines the implementation of multi-chain swaps in our desktop app, supporting both Solana (via Jupiter) and Ethereum (via Uniswap V3).

## Architecture

We've implemented a unified swap interface that supports both Solana and Ethereum chains. The system consists of:

1. **ChainSwapModal**: A wrapper component that renders either the Solana or Ethereum swap UI based on the selected chain.
2. **SwapModal**: The original Solana swap implementation using Jupiter.
3. **EthSwapHandler**: A handler component for Ethereum swaps using Uniswap V3.
4. **Utility Files**: Helpers for both chains (ethSwapUtils.ts, handleEthSwap.ts).

## File Structure

```
desktop-app/components/wallet/swapModal/
├── ChainSwapModal.tsx         # Main entry point for multi-chain swaps
├── SwapModal.tsx              # Original Solana swap implementation
├── TokenImage.tsx             # Shared token image component
├── types.ts                   # Shared TypeScript types
├── README.md                  # Usage documentation
├── IMPLEMENTATION.md          # This file
└── utils/
    ├── ethSwapUtils.ts        # Ethereum swap utilities
    ├── handleEthSwap.ts       # Ethereum swap handler
    ├── EthSwapHandler.tsx     # Ethereum swap UI handler
    ├── EthPriceCard.tsx       # Ethereum price display component
    ├── swapUtils.ts           # Solana swap utilities
    ├── handleSwap.ts          # Solana swap handler
    ├── SlippageControl.tsx    # Shared slippage control for both chains
    └── PriceCard.tsx          # Solana price display component
```

## Implementation Details

### Ethereum Swap Implementation (Sepolia Testnet)

1. **Contract Addresses**: We're using the official Uniswap V3 contracts on Sepolia testnet.
   - SwapRouter: `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E`
   - QuoterV2: `0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3`
   - Factory: `0x0227628f3F023bb0B980b67D528571c95c6DaC1c`

2. **Token Support**: We support the following tokens on Sepolia:
   - ETH (Native)
   - WETH: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`
   - USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
   - DAI: `0x68194a729C2450ad26072b3D33ADaCbcef39D574`
   - LINK: `0x779877A7B0D9E8603169DdbD7836e478b4624789`
   - UNI: `0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984`

3. **Swap Process**:
   - Get a quote from Uniswap V3 QuoterV2
   - Handle token approvals for ERC20 tokens
   - Execute swap via Uniswap V3 SwapRouter
   - Save transaction details and update UI

### Integration with Existing Solana Implementation

The ChainSwapModal component serves as a wrapper that renders:
- The original SwapModal for Solana swaps
- A new Ethereum-specific UI with EthSwapHandler for Ethereum swaps

### How to Upgrade to Mainnet

To deploy this implementation to Ethereum mainnet:

1. Update the contract addresses in `ethSwapUtils.ts` to point to mainnet:
   ```typescript
   // Uniswap v3 contract addresses on Ethereum Mainnet
   export const UNISWAP_CONTRACTS = {
     SwapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
     QuoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
     Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
   };
   ```

2. Update the token addresses to use mainnet tokens:
   ```typescript
   export const ETH_TOKEN_ADDRESSES = {
     WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
     USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
     DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
     LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
     UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
   };
   ```

3. Update any Etherscan links to point to mainnet:
   ```typescript
   // Change from:
   `https://sepolia.etherscan.io/tx/${txHash}`
   // To:
   `https://etherscan.io/tx/${txHash}`
   ```

## Testing

1. **Prerequisites**:
   - A wallet with Sepolia ETH and test tokens
   - MetaMask or another web3 wallet installed

2. **Test Flow**:
   - Connect wallet to the app
   - Select Ethereum chain
   - Open the swap modal
   - Select tokens and amount
   - Execute swap
   - Verify transaction on Sepolia Etherscan

## Additional Considerations

1. **Gas Fees**: The implementation includes gas estimation and a 20% buffer to ensure transactions succeed.

2. **Error Handling**: Comprehensive error handling for common Ethereum swap errors.

3. **Slippage Protection**: Configurable slippage tolerance to protect against price movements.

4. **Platform Fees**: Support for platform fees similar to our Solana implementation.

5. **Future Improvements**:
   - Add more advanced routing options
   - Support for multiple pool fee tiers
   - Integrate with price oracles for better price impact calculations
   - Add support for wrapped native tokens
   - Implement gasless swaps using EIP-2771 