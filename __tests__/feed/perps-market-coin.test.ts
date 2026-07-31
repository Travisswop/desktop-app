import { resolvePerpsMarketCoin } from '@/components/feed/usePerpsMarketCoin';
import { normalizePerpsCoin } from '@/components/feed/useLivePerpsMarkPrice';

// Hyperliquid needs a qualified market name (`vntl:SPACEX`); a bare builder
// ticker 500s on candleSnapshot and the card falls back to drawing a straight
// line between entry and mark. Resolution used to be a hardcode sending both
// SPCX and SPACEX to `xyz:SPCX` — but `xyz` lists SpaceX as SPCX and Ventuals
// lists it as SPACEX, at its own price, so Ventuals positions were charted
// against the wrong market entirely.

const index = {
  main: new Set(['BTC', 'ETH', 'SOL', 'HYPE']),
  builder: new Map<string, string[]>([
    // Deployment order matters for ambiguous tickers: xyz ships before the rest.
    ['TSLA', ['xyz:TSLA', 'flx:TSLA', 'km:TSLA', 'cash:TSLA']],
    ['SPCX', ['xyz:SPCX']],
    ['SPACEX', ['vntl:SPACEX']],
    ['OPENAI', ['vntl:OPENAI']],
    ['ANTHROPIC', ['vntl:ANTHROPIC']],
    ['GOLD', ['xyz:GOLD', 'flx:GOLD']],
  ]),
};

describe('resolvePerpsMarketCoin', () => {
  it('keeps SpaceX on Ventuals distinct from SpaceX on xyz', () => {
    // The whole point: these are two markets at two prices.
    expect(resolvePerpsMarketCoin('SPACEX', index)?.requestCoin).toBe(
      'vntl:SPACEX',
    );
    expect(resolvePerpsMarketCoin('SPCX', index)?.requestCoin).toBe('xyz:SPCX');
  });

  it('resolves Ventuals-only names that previously resolved to nothing', () => {
    expect(resolvePerpsMarketCoin('OPENAI', index)?.requestCoin).toBe(
      'vntl:OPENAI',
    );
    expect(resolvePerpsMarketCoin('ANTHROPIC', index)?.requestCoin).toBe(
      'vntl:ANTHROPIC',
    );
  });

  it('carries the dex through so the card treats it as a builder market', () => {
    const resolved = resolvePerpsMarketCoin('OPENAI', index);
    expect(resolved?.dex).toBe('vntl');
    expect(resolved?.displayCoin).toBe('OPENAI');
  });

  it('leaves first-party markets alone', () => {
    expect(resolvePerpsMarketCoin('BTC', index)?.requestCoin).toBe('BTC');
    expect(resolvePerpsMarketCoin('BTC', index)?.dex).toBeUndefined();
  });

  it('never re-resolves an already-qualified coin', () => {
    // A stored `vntl:SPACEX` must not be dragged to xyz by ticker matching.
    expect(resolvePerpsMarketCoin('vntl:SPACEX', index)?.requestCoin).toBe(
      'vntl:SPACEX',
    );
    expect(resolvePerpsMarketCoin('XYZ:TSLA', index)?.requestCoin).toBe(
      'xyz:TSLA',
    );
  });

  it('picks the earliest-deployed dex for tickers listed on several', () => {
    // TSLA is on xyz, flx, km and cash. Without a stored dex the choice is a
    // guess, but it must be deterministic and must still produce a real market.
    expect(resolvePerpsMarketCoin('TSLA', index)?.requestCoin).toBe('xyz:TSLA');
    expect(resolvePerpsMarketCoin('GOLD', index)?.requestCoin).toBe('xyz:GOLD');
  });

  it('falls back to the bare ticker when the index has not loaded', () => {
    // Cards render before the index resolves; behaviour must match today's.
    expect(resolvePerpsMarketCoin('SPACEX', undefined)?.requestCoin).toBe(
      'SPACEX',
    );
  });

  it('falls back to the bare ticker for unknown markets', () => {
    expect(resolvePerpsMarketCoin('NOTALISTING', index)?.requestCoin).toBe(
      'NOTALISTING',
    );
  });

  it('handles empty and malformed input the same as the parser', () => {
    expect(resolvePerpsMarketCoin('', index)).toBeNull();
    expect(resolvePerpsMarketCoin(null, index)).toBeNull();
    expect(resolvePerpsMarketCoin(undefined, index)).toBeNull();
  });

  it('tolerates an index with an empty match list', () => {
    const sparse = { main: new Set<string>(), builder: new Map([['X', []]]) };
    expect(resolvePerpsMarketCoin('X', sparse)?.requestCoin).toBe('X');
  });
});

describe('normalizePerpsCoin', () => {
  it('no longer guesses a dex for bare tickers', () => {
    // Guessing here is what mis-charted Ventuals positions.
    expect(normalizePerpsCoin('SPACEX')).toEqual({
      requestCoin: 'SPACEX',
      displayCoin: 'SPACEX',
    });
    expect(normalizePerpsCoin('SPCX')).toEqual({
      requestCoin: 'SPCX',
      displayCoin: 'SPCX',
    });
  });

  it('lowercases the dex so Hyperliquid accepts the name', () => {
    // Feed identity keys are stored uppercased (`XYZ:SPCX`), but the API only
    // answers to `xyz:SPCX`.
    expect(normalizePerpsCoin('XYZ:SPCX')).toEqual({
      requestCoin: 'xyz:SPCX',
      dex: 'xyz',
      displayCoin: 'SPCX',
    });
  });
});
