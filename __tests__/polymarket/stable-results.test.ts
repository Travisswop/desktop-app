import { mergeSettledArrays } from '@/lib/polymarket/stable-results';

describe('Polymarket settled result merging', () => {
  it('keeps successful position data when another wallet refresh fails', () => {
    const results: PromiseSettledResult<Array<{ asset: string }>>[] = [
      { status: 'fulfilled', value: [{ asset: 'winner' }] },
      { status: 'rejected', reason: new Error('timeout') },
    ];

    expect(mergeSettledArrays(results, 'Failed to fetch positions')).toEqual([
      { asset: 'winner' },
    ]);
  });

  it('throws when every upstream request failed so React Query can keep prior data', () => {
    const results: PromiseSettledResult<Array<{ asset: string }>>[] = [
      { status: 'rejected', reason: new Error('timeout') },
    ];

    expect(() =>
      mergeSettledArrays(results, 'Failed to fetch positions'),
    ).toThrow('Failed to fetch positions');
  });
});
