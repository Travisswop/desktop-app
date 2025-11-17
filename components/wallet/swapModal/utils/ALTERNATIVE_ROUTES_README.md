# Alternative Route Finding for Jupiter Swaps

When Jupiter routing fails due to insufficient liquidity (error code `0x177e` / `6014`), this utility provides several strategies to find alternative routes or liquidity pools.

## Features

1. **Automatic Alternative Route Discovery**: When a swap fails due to liquidity issues, the system automatically tries different routing strategies
2. **DEX Liquidity Checking**: Check which DEXes have sufficient liquidity for a token pair
3. **Reduced Amount Routing**: Find routes with reduced swap amounts when full amount fails
4. **Multiple Routing Strategies**: Try different Jupiter API parameters to find viable routes

## How It Works

### When Jupiter Routing Fails

When a swap fails with error `0x177e` (insufficient liquidity), the system automatically:

1. **Tries Alternative Routing Strategies**:
   - Direct routes only (single-hop, no intermediate tokens)
   - Restricted intermediate tokens (only high-liquidity tokens)
   - Major DEXes only (Raydium, Orca, Meteora)
   - Combination strategies

2. **Tries Reduced Amounts**:
   - If no alternative route is found, tries with 50% reduced amount
   - Suggests the user reduce their swap amount

3. **Provides Detailed Error Messages**:
   - Shows which DEXes have liquidity (if any)
   - Suggests specific actions based on the error

## Usage Examples

### Check Which DEXes Have Liquidity

```typescript
import { findDexesWithLiquidity } from './findAlternativeRoutes';

const dexes = await findDexesWithLiquidity(
  'So11111111111111111111111111111111111111112', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  '1000000000', // 1 SOL
  200 // 2% slippage
);

console.log('DEXes with liquidity:', dexes);
// Output: ['Raydium', 'Orca', 'Meteora']
```

### Find Alternative Route Manually

```typescript
import { findAlternativeRoute } from './findAlternativeRoutes';

const alternativeQuote = await findAlternativeRoute(
  inputMint,
  outputMint,
  amount,
  slippageBps,
  platformFeeBps
);

if (alternativeQuote) {
  // Use this quote for the swap
  console.log('Found route:', alternativeQuote.routePlan);
}
```

### Check Specific DEX Liquidity

```typescript
import { checkDexLiquidity } from './findAlternativeRoutes';

const rayiumQuote = await checkDexLiquidity(
  inputMint,
  outputMint,
  amount,
  'Raydium',
  slippageBps
);

if (rayiumQuote) {
  console.log('Raydium has sufficient liquidity');
}
```

## Routing Strategies

The system tries these strategies in order:

1. **Direct Routes Only**: `onlyDirectRoutes: true`
   - Single-hop swaps only
   - Avoids multi-hop routes that may have liquidity issues

2. **Restrict Intermediate Tokens**: `restrictIntermediateTokens: true`
   - Only uses high-liquidity intermediate tokens (like USDC, SOL)
   - Reduces risk of hitting low-liquidity pools

3. **Direct + Restricted**: Both parameters enabled
   - Most conservative approach
   - Best for avoiding routing failures

4. **Major DEXes Only**: `dexes: 'Raydium,Orca,Meteora'`
   - Only routes through well-established DEXes
   - Avoids smaller or newer DEXes that may have liquidity issues

## Integration

The alternative route finding is automatically integrated into `handleSwap.ts`. When a swap fails with a liquidity error:

1. The system detects the error code `0x177e` or `6014`
2. Automatically tries alternative routing strategies
3. If successful, retries the swap with the new route
4. If unsuccessful, suggests reducing the swap amount

## Error Messages

When liquidity is insufficient, users will see helpful messages like:

- "Insufficient liquidity for this swap amount. Try reducing the amount by 50% or more."
- "Available DEXes with liquidity may be limited for this token pair."
- "Found route with reduced amount: [amount] (reduced from [original])"

## Best Practices

1. **Check Liquidity Before Large Swaps**: Use `findDexesWithLiquidity()` to check available pools
2. **Start with Smaller Amounts**: For new token pairs, try smaller amounts first
3. **Monitor Price Impact**: High price impact may indicate low liquidity
4. **Use Appropriate Slippage**: Higher slippage may help, but be cautious

## API Endpoints Used

- **Jupiter Quote API**: `https://quote-api.jup.ag/v6/quote`
- **Jupiter Swap API**: `https://lite-api.jup.ag/swap/v1/swap`
- **DEX Labels API**: `https://public.jupiterapi.com/program-id-to-label`

## Limitations

- Alternative routes may have worse prices than the original route
- Some token pairs may simply not have sufficient liquidity on any DEX
- Reduced amount routes require user confirmation
- Checking multiple DEXes can take several seconds

## Future Enhancements

- Cache DEX liquidity information
- Pre-check liquidity before showing swap quotes
- Show available DEXes in the UI
- Allow users to select preferred DEXes
- Implement automatic amount reduction with user confirmation

