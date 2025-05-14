# Swap Modal Component

The Swap Modal component provides a user-friendly interface for swapping tokens on the Solana blockchain using the Jupiter Exchange aggregator. It allows users to exchange tokens with competitive rates, customizable slippage, and priority fees.

## Features

- **Token Selection**: Search and select from a wide range of Solana tokens
- **Quote Fetching**: Automatically fetch real-time quotes from Jupiter Exchange
- **Auto-refresh**: Quotes automatically refresh every 10 seconds to ensure accuracy
- **Slippage Control**: Customizable slippage tolerance (default 0.5%)
- **Priority Fee Selection**: Choose priority level for faster transaction processing
- **Platform Fees**: Integrated 0.5% platform fee collection system
- **Transaction Status**: Real-time transaction status updates and confirmation
- **Balance Management**: View and manage token balances with half/max amount buttons

## Component Structure

- **SwapModal.tsx**: Main component that handles the swap interface
- **types.ts**: TypeScript interfaces for the component
- **utils/**: Helper functions and subcomponents

### Key Subcomponents

- **SlippageControl**: Allows users to adjust slippage tolerance
- **PriceCard**: Displays price information and impact
- **PriorityFeeSelector**: Lets users choose transaction priority level

## Usage

```tsx
import SwapModal from '@/components/wallet/swapModal/SwapModal';

// Inside your component
const [open, setOpen] = useState(false);

return (
  <>
    <Button onClick={() => setOpen(true)}>Swap Tokens</Button>
    <SwapModal
      open={open}
      onOpenChange={setOpen}
      userToken={yourTokenArray}
      accessToken={yourAccessToken}
    />
  </>
);
```

## API Reference

### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | boolean | Controls whether the modal is displayed |
| `onOpenChange` | function | Callback function when modal open state changes |
| `userToken` | TokenInfo[] | Array of user's tokens |
| `accessToken` | string | Authentication token for API requests |

### TokenInfo Interface

```typescript
interface TokenInfo {
  symbol: string;
  address?: PublicKey;
  id?: PublicKey;
  icon?: string;
  logoURI?: string;
  decimals?: number;
  balance?: string;
  price?: string;
  usdPrice?: string;
  marketData?: { price?: string; };
  name?: string;
}
```

## Platform Fee System

The swap functionality includes a platform fee system that collects a 0.5% fee (50 basis points) on all swap transactions. The implementation:

1. Creates token accounts for the platform fee wallet if needed
2. Collects fees in the input token (the token being swapped)
3. Uses Jupiter's API for processing the swap with fee collection

See the [utils/README.md](./utils/README.md) for detailed information on the fee collection system.

## How It Works

1. **Token Selection**: User selects input and output tokens
2. **Amount Input**: User enters the amount they want to swap
3. **Quote Fetching**: System fetches real-time quotes from Jupiter
4. **Transaction Preparation**: Creates and simulates the transaction before sending
5. **Transaction Execution**: Executes the swap transaction
6. **Status Updates**: Provides real-time updates on transaction status
7. **Confirmation**: Displays success message with transaction signature

## Dependencies

- **Solana Web3.js**: For blockchain interaction
- **Jupiter API**: For swap routing and execution
- **Privy Auth**: For wallet connection via `useSolanaWallets` hook
- **Lucide Icons**: For UI elements
- **React**: For component framework
- **Next.js**: For application framework

## Developer Notes

- Ensure the `NEXT_PUBLIC_QUICKNODE_SOLANA_URL` environment variable is set for RPC connections
- Platform fee configuration is in `utils/feeConfig.ts` (set to 50 basis points or 0.5%)
- Transaction handling is managed in `utils/handleSwap.ts`
- Token utilities are available in `utils/swapUtils.ts`
- Token account creation is handled in `utils/tokenAccountUtils.ts`
- Private key for fee collection must be set in environment variables