import {
  checkSwapLegConsistency,
  rawToDecimal,
  resolveSwapReceiptLegs,
} from '@/lib/wallet/swapReceipt';

const leg = (over: Record<string, unknown> = {}) => ({
  symbol: 'USDC',
  chain: '137',
  amount: 1,
  decimals: 6,
  mint: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  price: '1',
  tokenImg: '',
  ...over,
});

describe('checkSwapLegConsistency', () => {
  it('accepts legs that agree on USD', () => {
    const result = checkSwapLegConsistency(
      { amount: 100, price: 1 },
      { amount: 0.0498, price: 2000 }
    );
    expect(result.ok).toBe(true);
    expect(result.ratio).toBeCloseTo(0.996, 3);
  });

  it('accepts the normal fee + slippage haircut', () => {
    // 0.5% integrator fee plus a point of slippage still lands well inside
    // the band; the guard must never reject an ordinary swap.
    const result = checkSwapLegConsistency(
      { amount: 1, price: 2113.78 },
      { amount: 0.985, price: 2113.45 }
    );
    expect(result.ok).toBe(true);
  });

  it('rejects the live ETH → 337 ETH receipt', () => {
    // swopfeedposts 6a0c32289c2a36e15b749f0d: $2.11 in, $712,877 out.
    const result = checkSwapLegConsistency(
      { amount: 0.001, price: '2113.78' },
      { amount: 337.305, price: '2113.45' }
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('leg_usd_divergence');
  });

  it('rejects the live raw-base-unit MATIC receipt', () => {
    // feedposts 693e5a4a74e4781ba2956af4: MATIC recorded with decimals 9
    // against its real 18, so the raw integer survived into the receipt.
    const result = checkSwapLegConsistency(
      { amount: 0.143594, price: '1' },
      { amount: '918829000', price: '0.119341' }
    );
    expect(result.ok).toBe(false);
  });

  it('cannot judge an unpriced leg', () => {
    const result = checkSwapLegConsistency(
      { amount: 100, price: '0' },
      { amount: 1, price: 2000 }
    );
    expect(result.ok).toBe(true);
    expect(result.reason).toBe('below_judgeable_usd');
  });

  it('cannot judge dust', () => {
    const result = checkSwapLegConsistency(
      { amount: 0.000001, price: 1 },
      { amount: 1000, price: 0.0000001 }
    );
    expect(result.ok).toBe(true);
  });
});

describe('rawToDecimal', () => {
  it('scales by the given decimals', () => {
    expect(rawToDecimal('918829000000000000', 18)).toBeCloseTo(0.918829, 6);
  });

  it('refuses nonsense decimals', () => {
    expect(rawToDecimal('1000', 99)).toBeNull();
    expect(rawToDecimal('not-a-number', 6)).toBeNull();
  });
});

describe('resolveSwapReceiptLegs', () => {
  it('rebuilds both legs from a LI.FI quote', () => {
    const resolved = resolveSwapReceiptLegs({
      quote: {
        estimate: {
          fromToken: {
            symbol: 'pUSD',
            decimals: 6,
            address: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB',
            chainId: 137,
            priceUSD: '1',
          },
          toToken: {
            symbol: 'SWOP',
            decimals: 9,
            address: 'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1',
            chainId: 1151111081099710,
            priceUSD: '0.00607723',
          },
          fromAmount: '1000000',
          toAmount: '151542275425',
          fromAmountUSD: '1.0000',
          toAmountUSD: '0.9210',
        },
      },
      stateInput: leg({ symbol: 'pUSD' }),
      // The picker has drifted to SOL — exactly the state that produced the
      // live "151.341 SOL @ $85" receipt for a $1 swap.
      stateOutput: leg({
        symbol: 'SOL',
        decimals: 9,
        amount: 151.341,
        price: 85.17,
        chain: '1151111081099710',
      }),
    });

    expect(resolved.ok).toBe(true);
    expect(resolved.source).toBe('lifi_quote');
    expect(resolved.outputToken.symbol).toBe('SWOP');
    expect(resolved.outputToken.amount).toBeCloseTo(151.542275425, 6);
    expect(Number(resolved.outputToken.price)).toBeCloseTo(0.006078, 5);
  });

  it('ignores a token list that lies about decimals', () => {
    const resolved = resolveSwapReceiptLegs({
      quote: {
        estimate: {
          fromToken: { symbol: 'USDC', decimals: 6, chainId: 137, priceUSD: '1' },
          toToken: {
            symbol: 'MATIC',
            // LI.FI reports the real 18 even when the local list says 9.
            decimals: 18,
            chainId: 137,
            priceUSD: '0.119341',
          },
          fromAmount: '143594',
          toAmount: '918829000000000000',
        },
      },
      stateInput: leg({ amount: 0.143594 }),
      stateOutput: leg({ symbol: 'MATIC', decimals: 9, amount: 918829000, price: '0.119341' }),
    });

    expect(resolved.ok).toBe(true);
    expect(resolved.outputToken.decimals).toBe(18);
    expect(resolved.outputToken.amount).toBeCloseTo(0.918829, 6);
  });

  it('keeps a quote-verified receipt even when the legs diverge', () => {
    // A real cross-chain hop on a couple of dollars can lose most of its value
    // to bridge and relayer fees. LI.FI says this is what moved, so the receipt
    // is true and must be posted — the band only judges unproven numbers.
    const resolved = resolveSwapReceiptLegs({
      quote: {
        estimate: {
          fromToken: { symbol: 'POL', decimals: 18, chainId: 137, priceUSD: '0.276' },
          toToken: { symbol: 'SOL', decimals: 9, chainId: 1151111081099710, priceUSD: '197.36' },
          fromAmount: '5000000000000000000',
          // ~$0.40 out against $1.38 in — a 0.29x ratio, below the band.
          toAmount: '2000000',
        },
      },
      stateInput: leg({ symbol: 'POL' }),
      stateOutput: leg({ symbol: 'SOL' }),
    });

    expect(resolved.source).toBe('lifi_quote');
    expect(resolved.consistency.ok).toBe(false);
    expect(resolved.ok).toBe(true);
  });

  it('refuses a Jupiter receipt whose mints no longer match the pickers', () => {
    const resolved = resolveSwapReceiptLegs({
      quote: {
        inputMint: 'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1',
        outputMint: 'So11111111111111111111111111111111111111112',
      },
      stateInput: leg({ symbol: 'SWOP', mint: 'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1' }),
      stateOutput: leg({ symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }),
    });

    expect(resolved.ok).toBe(false);
    expect(resolved.reason).toBe('quote_token_mismatch');
  });

  it('keeps state legs for a Jupiter receipt whose mints still match', () => {
    const resolved = resolveSwapReceiptLegs({
      quote: {
        inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        outputMint: 'So11111111111111111111111111111111111111112',
      },
      stateInput: leg({
        symbol: 'USDC',
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 100,
        price: 1,
      }),
      stateOutput: leg({
        symbol: 'SOL',
        mint: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        amount: 1.33,
        price: 74.5,
      }),
    });

    expect(resolved.ok).toBe(true);
    expect(resolved.source).toBe('ui_state');
    expect(resolved.outputToken.symbol).toBe('SOL');
  });

  it('still rejects state legs whose USD values diverge', () => {
    const resolved = resolveSwapReceiptLegs({
      quote: {},
      stateInput: leg({ amount: 0.001, price: '2113.78', symbol: 'ETH', decimals: 18 }),
      stateOutput: leg({ amount: 337.305, price: '2113.45', symbol: 'ETH', decimals: 18 }),
    });

    expect(resolved.ok).toBe(false);
    expect(resolved.reason).toBe('leg_usd_divergence');
  });
});
