# Platform Fee Collection for Jupiter Swap

This directory contains the implementation for collecting platform fees from Jupiter swap transactions.

## Overview

- Platform fees are set to 0.5% (50 basis points) for all swap transactions
- Fees are collected in the token being swapped (input token)
- The system automatically checks if a token account exists for the platform fee wallet and creates one if needed

## Setup Instructions

### 1. Set your private key in the environment file

Create a `.env.local` file in the root of your project with the following:


Replace `YOUR_PRIVATE_KEY_IN_BASE58` with the private key of your fee wallet. This key is used to:
- Sign transactions that create token accounts for collecting fees
- It should be the private key for the wallet address: HPmEbq6VMzE8dqRuFjLrNNxmqzjvP72jCofoFap5vBR2

> Note: The `NEXT_PUBLIC_` prefix is required for client-side access in Next.js applications.

### 2. Understanding the Token Account Creation Process

The system will:
1. Check if a token account for the specific token already exists for the fee wallet
2. If it exists, use that account to collect fees
3. If it doesn't exist, create a new associated token account

### 3. Testing

To test the fee collection:
1. Make sure your environment variables are set up correctly
2. Perform a swap transaction with the UI
3. Check the transaction on Solscan or Solana Explorer to verify fees were collected
4. Review your fee wallet balance to confirm you received the fee

## Implementation Details

- `feeConfig.ts`: Contains the platform fee wallet address and fee percentage (50 BPS = 0.5%)
- `tokenAccountUtils.ts`: Utility to check and create token accounts for fee collection
- `handleSwap.ts`: Updated to incorporate fee collection in the swap process
- `swapUtils.ts`: Utilities for token information and formatting
- `SlippageControl.tsx`: Component for adjusting slippage tolerance
- `PriceCard.tsx`: Component for displaying price information
- `PriorityFeeSelector.tsx`: Component for selecting transaction priority levels

## Troubleshooting

If fees are not being collected:
1. Verify your private key is correctly set in the .env.local file (with NEXT_PUBLIC_ prefix)
2. Check that the wallet address in feeConfig.ts matches the wallet for your private key
3. Ensure the token account exists or can be created for the token being swapped
4. Review logs for any errors during the token account creation or swap process