import {
  getPrimaryMicrosite,
  hasClaimedSwopId,
  requiresSwopIdCompletion,
} from '@/lib/onboardingStatus';

describe('onboarding status', () => {
  it('requires Swop ID completion when a user has a Smartsite but no Swop ID', () => {
    expect(
      requiresSwopIdCompletion({
        _id: 'user-1',
        primaryMicrosite: 'site-1',
        ensName: '',
        microsites: [{ _id: 'site-1', primary: true, ens: '' }],
      }),
    ).toBe(true);
  });

  it('treats a user-level swop.id as complete', () => {
    expect(
      requiresSwopIdCompletion({
        _id: 'user-1',
        primaryMicrosite: 'site-1',
        ensName: 'tester.swop.id',
        microsites: [{ _id: 'site-1', primary: true, ens: '' }],
      }),
    ).toBe(false);
  });

  it('treats a primary Smartsite swop.id as complete', () => {
    const user = {
      _id: 'user-1',
      primaryMicrosite: 'site-1',
      microsites: [
        { _id: 'site-2', ens: 'other.swop.id' },
        { _id: 'site-1', ens: 'tester.swop.id' },
      ],
    };

    expect(getPrimaryMicrosite(user)?._id).toBe('site-1');
    expect(hasClaimedSwopId(user)).toBe(true);
    expect(requiresSwopIdCompletion(user)).toBe(false);
  });

  it('does not resume Swop ID completion before Smartsite creation', () => {
    expect(
      requiresSwopIdCompletion({
        _id: 'user-1',
        ensName: '',
        microsites: [],
      }),
    ).toBe(false);
  });
});
