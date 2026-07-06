function formatVisibleButtons(visibleButtons) {
  return visibleButtons.join(' | ') || 'none';
}

async function ensureChatReady({
  hasComposer,
  selectThread,
  inspectChatShellState,
  waitForComposer,
  openAstroDesk,
  threadText,
}) {
  if (await hasComposer()) {
    return 'Chat composer was already ready.';
  }

  const selectedConfiguredThread = await selectThread(threadText);
  if (selectedConfiguredThread) {
    const composerReady = await waitForComposer(
      `chat composer after selecting "${threadText}"`
    );
    if (composerReady) {
      return `Selected thread containing "${threadText}" and confirmed the composer is ready.`;
    }
  }

  const shellState = await inspectChatShellState();
  if (shellState.hasComposer) {
    return 'Chat composer became ready after shell load.';
  }

  if (shellState.hasZeroThreads || shellState.hasAstroEmptyStateCopy) {
    if (!shellState.hasOpenAstroDeskCta) {
      throw new Error(
        `Authenticated chat is stuck in a zero-thread empty state without a supported Astro recovery CTA. Visible buttons: ${formatVisibleButtons(shellState.visibleButtons)}. Visible text: ${shellState.textExcerpt}`
      );
    }

    await openAstroDesk();
    const recovered = await waitForComposer(
      'chat composer after empty-state Astro recovery'
    );
    if (!recovered) {
      const retryState = await inspectChatShellState();
      throw new Error(
        `Open Astro Trading Desk CTA did not reach a usable composer. Visible buttons: ${formatVisibleButtons(retryState.visibleButtons)}. Visible text: ${retryState.textExcerpt}`
      );
    }

    return 'Recovered a zero-thread account via the empty-state Open Astro Trading Desk CTA.';
  }

  throw new Error(
    `Authenticated chat shell never reached a ready composer. Configured thread: ${threadText || 'none'}. Visible buttons: ${formatVisibleButtons(shellState.visibleButtons)}. Visible text: ${shellState.textExcerpt}`
  );
}

module.exports = {
  ensureChatReady,
};
