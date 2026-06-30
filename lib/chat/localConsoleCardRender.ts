export type LocalConsoleReadAction = 'portfolio.pnl' | 'wallet.portfolio';

export interface LocalConsoleReadMessageLike {
  message?: string | null;
  messageType?: string | null;
  senderKind?: string | null;
  agentData?: {
    action?: string | null;
    metadata?: {
      responseType?: string | null;
      toolExecution?: {
        action?: string | null;
        pnlOverview?: unknown;
        portfolioSnapshot?: unknown;
      } | null;
    } | null;
  } | null;
}

function messageMatchesAction(
  message: LocalConsoleReadMessageLike,
  action: LocalConsoleReadAction
) {
  return (
    message.agentData?.action === action ||
    message.agentData?.metadata?.toolExecution?.action === action
  );
}

export function hasRenderableLocalConsoleReadPayload(
  message: LocalConsoleReadMessageLike,
  action: LocalConsoleReadAction
) {
  if (!messageMatchesAction(message, action)) return false;

  if (action === 'portfolio.pnl') {
    return Boolean(message.agentData?.metadata?.toolExecution?.pnlOverview);
  }

  return (
    Boolean(message.agentData?.metadata?.toolExecution?.portfolioSnapshot) ||
    message.agentData?.metadata?.responseType === 'portfolio_snapshot' ||
    messageMatchesAction(message, 'wallet.portfolio')
  );
}

export function hasFollowingRenderableLocalConsoleCardMessage(
  messages: LocalConsoleReadMessageLike[],
  sourceIndex: number,
  action: LocalConsoleReadAction
) {
  for (let index = sourceIndex + 1; index < messages.length; index += 1) {
    const candidate = messages[index];
    if (!candidate) continue;

    if (
      candidate.senderKind !== 'agent' &&
      candidate.messageType === 'text' &&
      candidate.message?.trim()
    ) {
      return false;
    }

    if (hasRenderableLocalConsoleReadPayload(candidate, action)) {
      return true;
    }
  }

  return false;
}
