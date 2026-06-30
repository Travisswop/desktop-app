// Receipt formatting and share-image generation for agent action receipts.
// Extracted from ChatArea.tsx; pure module apart from the browser-only
// canvas/share APIs used at call time.

import type { AgentActionCompletion } from '@/lib/chat/agentActionHandoff';
import {
  formatCompactUsd,
  formatSwapAmount,
  formatWalletAddress,
} from '@/lib/chat/ticketFormat';
import { getPredictionReceiptSubject } from '@/lib/polymarket/formatting';

export function getReceiptId(receipt?: AgentActionCompletion | null) {
  if (!receipt) return '';
  return (
    receipt.proposalId ||
    receipt.orderId?.toString() ||
    receipt.txHash ||
    `${receipt.provider || 'agent'}:${receipt.placedAt || ''}`
  );
}

export function formatReceiptMoney(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return 'n/a';
  }
  if (typeof value === 'string' && value.trim().startsWith('$')) {
    return value.trim();
  }
  return formatCompactUsd(value);
}

export function shortReceiptHash(receipt: AgentActionCompletion) {
  const value = receipt.txHash || receipt.orderId;
  if (!value) return '';
  const text = String(value);
  if (text.length <= 12) return text;
  return `${text.slice(0, 5)}...${text.slice(-4)}`;
}

export function receiptSubtitle(receipt: AgentActionCompletion) {
  if (receipt.subtitle) return receipt.subtitle;
  if (receipt.provider === 'hyperliquid') return 'perps · frontend signed';
  if (receipt.provider === 'polymarket') return 'prediction · self-custodied';
  if (receipt.provider === 'marketplace') return 'marketplace · published';
  return 'self-custodied · settled';
}

export function receiptTitle(receipt: AgentActionCompletion) {
  const execution =
    receipt.executionResult && typeof receipt.executionResult === 'object'
      ? receipt.executionResult
      : {};

  if (receipt.provider === 'polymarket') {
    const marketTitle = String(execution.marketTitle || receipt.title || '');
    const outcome = String(execution.outcome || receipt.subject || '');
    const displayOutcome = String(
      execution.outcomeDisplay || receipt.subject || ''
    );
    const rawOutcomeIndex = Number(execution.outcomeIndex);
    return getPredictionReceiptSubject(outcome, marketTitle, {
      displayOutcome,
      outcomeIndex: Number.isInteger(rawOutcomeIndex)
        ? rawOutcomeIndex
        : undefined,
    });
  }

  return (
    receipt.subject ||
    receipt.title ||
    (receipt.provider === 'hyperliquid'
      ? 'Perps order'
      : receipt.provider === 'polymarket'
        ? 'Prediction order'
        : 'Swap')
  );
}

export function escapeSvgText(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapShareText(value: unknown, maxChars: number, maxLines: number) {
  const words = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const trimmed = lines.slice(0, maxLines);
  trimmed[trimmed.length - 1] = `${trimmed[trimmed.length - 1]
    .slice(0, Math.max(0, maxChars - 1))
    .trim()}...`;
  return trimmed;
}

export function receiptShareFileName(receipt: AgentActionCompletion) {
  const id = getReceiptId(receipt) || shortReceiptHash(receipt) || Date.now();
  return `swop-ticket-${String(id).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 48)}.png`;
}

export function buildReceiptShareSvg(receipt: AgentActionCompletion) {
  const confirmed = receipt.status !== 'failed';
  const execution =
    receipt.executionResult && typeof receipt.executionResult === 'object'
      ? receipt.executionResult
      : {};
  const isSend =
    receipt.provider === 'swop' &&
    (receipt.action === 'wallet.send' ||
      receipt.action === 'transfer_token' ||
      receipt.action === 'transfer_sol' ||
      execution.kind === 'send' ||
      (Boolean(execution.recipient) &&
        !execution.fromToken &&
        !execution.toToken));
  const title = receiptTitle(receipt);
  const placedAt = receipt.placedAt ? new Date(receipt.placedAt) : new Date();
  const placedLabel = placedAt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  const titleLines = wrapShareText(title, 20, 2);
  const subtitle = receiptSubtitle(receipt);
  const hash = shortReceiptHash(receipt) || 'audit logged';
  const sendTokenSymbol = String(
    execution.token || receipt.subject || 'TOKEN'
  ).toUpperCase();
  const sendAmountLabel = (() => {
    const tokenAmount = execution.tokenAmount;
    if (tokenAmount !== undefined && tokenAmount !== null && tokenAmount !== '') {
      return `${formatSwapAmount(tokenAmount)} ${sendTokenSymbol}`;
    }
    const amount = execution.amount;
    if (amount !== undefined && amount !== null && amount !== '') {
      return execution.amountType === 'usd'
        ? `${formatCompactUsd(amount)} in ${sendTokenSymbol}`
        : `${formatSwapAmount(amount)} ${sendTokenSymbol}`;
    }
    return sendTokenSymbol;
  })();
  const sendRecipientLabel =
    String(execution.recipientName || '').trim() ||
    (execution.recipient
      ? formatWalletAddress(String(execution.recipient))
      : 'recipient');
  const headlineAmount = isSend
    ? sendAmountLabel
    : receipt.toWin !== undefined
      ? formatReceiptMoney(receipt.toWin)
      : 'confirmed';
  const accent = !confirmed ? '#ff5d63' : isSend ? '#4da3ff' : '#3fe08f';
  const status = !confirmed ? 'FAILED' : isSend ? 'SENT' : 'CONFIRMED';
  const ticketLabel = isSend ? '✓ TRANSFER' : '✓ TICKET';
  const footerLabel = isSend
    ? 'self-custodied · transferred through Swop'
    : 'self-custodied · settled through Swop';
  const accentRowLabel = isSend ? 'SENT' : 'TO WIN';
  const detailRows = isSend
    ? [
        ['SENT', sendAmountLabel],
        ['TO', sendRecipientLabel],
        ['NETWORK', String(execution.network || subtitle).toUpperCase()],
        ['PLACED', placedLabel],
      ]
    : [
        ['STAKE', formatReceiptMoney(receipt.stake)],
        ['TO WIN', receipt.toWin !== undefined ? formatReceiptMoney(receipt.toWin) : 'settled'],
        ['PAYOUT', receipt.payout !== undefined ? formatReceiptMoney(receipt.payout) : 'n/a'],
        ['PLACED', placedLabel],
      ];

  return `
<svg width="1200" height="900" viewBox="0 0 1200 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="900" fill="#08090b"/>
  <rect x="136" y="96" width="928" height="708" rx="44" fill="#15171d" stroke="${accent}" stroke-opacity="0.42" stroke-width="3"/>
  <rect x="136" y="96" width="928" height="112" rx="44" fill="#111318"/>
  <path d="M136 208H1064" stroke="white" stroke-opacity="0.07" stroke-width="2"/>
  <path d="M140 210V756C140 782.51 161.49 804 188 804H1012C1038.51 804 1060 782.51 1060 756V210" stroke="${accent}" stroke-opacity="0.65" stroke-width="5"/>
  <text x="204" y="166" fill="${accent}" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="8">${ticketLabel}</text>
  <rect x="430" y="127" width="214" height="48" rx="16" fill="${accent}" fill-opacity="0.12" stroke="${accent}" stroke-opacity="0.22"/>
  <text x="537" y="160" fill="${accent}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="900" text-anchor="middle" letter-spacing="4">${status}</text>
  <text x="998" y="166" fill="#737783" font-family="monospace" font-size="24" font-weight="700" text-anchor="end">${escapeSvgText(hash)}</text>

  ${titleLines
    .map(
      (line, index) =>
        `<text x="204" y="${292 + index * 46}" fill="#eceef2" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="800">${escapeSvgText(line)}</text>`,
    )
    .join('')}
  <text x="204" y="${titleLines.length > 1 ? 392 : 348}" fill="#737783" font-family="monospace" font-size="26" font-weight="700">${escapeSvgText(subtitle)}</text>
  <text x="982" y="310" fill="${accent}" font-family="monospace" font-size="62" font-weight="900" text-anchor="end">${escapeSvgText(headlineAmount)}</text>

  <path d="M204 430H996" stroke="white" stroke-opacity="0.08" stroke-width="2"/>

  ${detailRows
    .map(([label, value], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? 204 : 606;
      const y = 500 + row * 146;
      const valueColor = label === accentRowLabel ? accent : '#eceef2';
      return `
  <text x="${x}" y="${y}" fill="#6f7380" font-family="monospace" font-size="25" font-weight="800" letter-spacing="7">${escapeSvgText(label)}</text>
  <text x="${x}" y="${y + 62}" fill="${valueColor}" font-family="monospace" font-size="38" font-weight="900">${escapeSvgText(value)}</text>`;
    })
    .join('')}

  <text x="600" y="752" fill="#5a5e69" font-family="monospace" font-size="22" font-weight="800" text-anchor="middle">${footerLabel} · ${escapeSvgText(hash)}</text>
  <text x="600" y="846" fill="#3fe08f" fill-opacity="0.82" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" text-anchor="middle">Swop</text>
</svg>`;
}

export async function createReceiptShareImage(receipt: AgentActionCompletion) {
  if (typeof window === 'undefined') {
    throw new Error('Sharing is only available in the browser.');
  }

  const svg = buildReceiptShareSvg(receipt);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = new window.Image();
    image.decoding = 'async';
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Ticket image failed to render.'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.drawImage(image, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Ticket image could not be created.'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareReceiptImage(receipt: AgentActionCompletion) {
  const blob = await createReceiptShareImage(receipt);
  const fileName = receiptShareFileName(receipt);
  const file = new File([blob], fileName, { type: 'image/png' });
  const shareData = {
    text: '📈 Here’s my call. Follow it on Swopme.app',
    files: [file],
  };

  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return 'shared';
  }

  const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem })
    .ClipboardItem;
  if (navigator.clipboard?.write && ClipboardItemCtor) {
    await navigator.clipboard.write([
      new ClipboardItemCtor({ 'image/png': blob }),
    ]);
    return 'copied';
  }

  downloadBlob(blob, fileName);
  return 'downloaded';
}
