import pageAuthHelpers from '../../scripts/qa/astroCardSmokePageAuth.cjs';

const { ensureChatReady } = pageAuthHelpers;

describe('ensureChatReady', () => {
  it('recovers a zero-thread account through the Astro desk CTA', async () => {
    const hasComposer = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const selectThread = jest.fn().mockResolvedValue(false);
    const inspectChatShellState = jest.fn().mockResolvedValue({
      hasComposer: false,
      hasZeroThreads: true,
      hasAstroEmptyStateCopy: true,
      hasOpenAstroDeskCta: true,
      visibleButtons: ['Open Astro Trading Desk'],
      textExcerpt:
        '0 threads Pick Astro Trading Desk, or create a group and mention @astro.',
    });
    const waitForComposer = jest
      .fn()
      .mockImplementation(async (description) => description.includes('empty-state'));
    const openAstroDesk = jest.fn().mockResolvedValue(undefined);

    await expect(
      ensureChatReady({
        hasComposer,
        selectThread,
        inspectChatShellState,
        waitForComposer,
        openAstroDesk,
        threadText: 'Trading Cabal',
      })
    ).resolves.toBe(
      'Recovered a zero-thread account via the empty-state Open Astro Trading Desk CTA.'
    );

    expect(openAstroDesk).toHaveBeenCalledTimes(1);
    expect(waitForComposer).toHaveBeenCalledWith(
      'chat composer after empty-state Astro recovery'
    );
  });

  it('fails with a typed zero-thread error when no recovery CTA is available', async () => {
    const inspectChatShellState = jest.fn().mockResolvedValue({
      hasComposer: false,
      hasZeroThreads: true,
      hasAstroEmptyStateCopy: true,
      hasOpenAstroDeskCta: false,
      visibleButtons: ['Create Chat'],
      textExcerpt:
        '0 threads Pick Astro Trading Desk, or create a group and mention @astro.',
    });

    await expect(
      ensureChatReady({
        hasComposer: jest.fn().mockResolvedValue(false),
        selectThread: jest.fn().mockResolvedValue(false),
        inspectChatShellState,
        waitForComposer: jest.fn().mockResolvedValue(false),
        openAstroDesk: jest.fn(),
        threadText: 'Trading Cabal',
      })
    ).rejects.toThrow(
      'Authenticated chat is stuck in a zero-thread empty state without a supported Astro recovery CTA.'
    );
  });

  it('fails with a typed Astro CTA error when the composer never becomes ready', async () => {
    const inspectChatShellState = jest
      .fn()
      .mockResolvedValueOnce({
        hasComposer: false,
        hasZeroThreads: true,
        hasAstroEmptyStateCopy: true,
        hasOpenAstroDeskCta: true,
        visibleButtons: ['Open Astro Trading Desk'],
        textExcerpt:
          '0 threads Pick Astro Trading Desk, or create a group and mention @astro.',
      })
      .mockResolvedValueOnce({
        hasComposer: false,
        hasZeroThreads: true,
        hasAstroEmptyStateCopy: true,
        hasOpenAstroDeskCta: true,
        visibleButtons: ['Open Astro Trading Desk', 'Create Chat'],
        textExcerpt:
          "Couldn't open Astro Trading Desk. Try the Messages rail pin or reload chat.",
      });

    await expect(
      ensureChatReady({
        hasComposer: jest.fn().mockResolvedValue(false),
        selectThread: jest.fn().mockResolvedValue(false),
        inspectChatShellState,
        waitForComposer: jest.fn().mockResolvedValue(false),
        openAstroDesk: jest.fn().mockResolvedValue(undefined),
        threadText: 'Trading Cabal',
      })
    ).rejects.toThrow(
      'Open Astro Trading Desk CTA did not reach a usable composer.'
    );
  });
});
