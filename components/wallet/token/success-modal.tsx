'use client';

import { NFT } from '@/types/nft';
import { TokenData } from '@/types/token';
import { ReceiverData } from '@/types/wallet';
import { Network } from '@/types/wallet-types';
import TransactionSuccessCelebration, {
  type TxRecapRow,
} from './transaction-success-celebration';

interface TransactionSuccessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  nft: NFT | null;
  token: TokenData | null;
  isUSD: boolean;
  hash: string;
  recipient?: ReceiverData | null;
  network?: Network;
}

const EXPLORERS: Record<string, string> = {
  ETHEREUM: 'https://etherscan.io/tx/',
  SOLANA: 'https://solscan.io/tx/',
  POLYGON: 'https://polygonscan.com/tx/',
  BASE: 'https://basescan.org/tx/',
  ARBITRUM: 'https://arbiscan.io/tx/',
  SEPOLIA: 'https://sepolia.etherscan.io/tx/',
};

const shorten = (addr?: string) =>
  addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr ?? '';

// Send-flow success. Maps the send-flow data onto the shared celebration modal
// (confetti, value bloom, recap, gasless card, share). Same props the send flow
// already passes, plus the recipient/network for the recap.
export default function TransactionSuccess({
  open,
  onOpenChange,
  amount,
  nft,
  token,
  isUSD,
  hash,
  recipient,
  network,
}: TransactionSuccessProps) {
  const chain = (token?.chain || network || 'ETHEREUM') as string;
  const explorerBase = EXPLORERS[chain];
  const explorerUrl = hash && explorerBase ? `${explorerBase}${hash}` : null;
  const hashLabel = hash ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : undefined;
  const recipientLabel = recipient?.ensName || shorten(recipient?.address);

  const price = token?.marketData?.price ? parseFloat(token.marketData.price) : 0;
  const parsedAmount = parseFloat(amount || '0');
  const tokenAmount = isUSD ? (price ? parsedAmount / price : 0) : parsedAmount;
  const usdAmount = price ? (isUSD ? parsedAmount : parsedAmount * price) : 0;

  // NFT send — no token amount / fee comparison; celebrate the transfer itself.
  if (nft) {
    const recap: TxRecapRow[] = [
      {
        label: 'Sent',
        value: nft.name || 'NFT',
        coin: { label: (nft.name || 'N').slice(0, 1).toUpperCase(), uri: nft.image },
        mono: false,
        sign: '',
      },
      {
        label: 'To',
        value: recipientLabel || '—',
        coin: { label: (recipientLabel || '?').slice(0, 1).toUpperCase() },
        mono: true,
      },
    ];
    return (
      <TransactionSuccessCelebration
        open={open}
        onClose={() => onOpenChange(false)}
        type="send"
        eyebrow="Payment sent"
        heroLabel="You sent"
        heroAmount={1}
        heroDecimals={0}
        heroSymbol={nft.name || 'NFT'}
        heroCoin={{ label: (nft.name || 'N').slice(0, 1).toUpperCase(), uri: nft.image }}
        heroSub={recipientLabel ? `to ${recipientLabel}` : ''}
        recap={recap}
        conf="Confirmed"
        hashLabel={hashLabel}
        explorerUrl={explorerUrl}
        notionalUsd={0}
        shareText="Just sent an NFT on Swop"
        joke={false}
      />
    );
  }

  const sym = (token?.symbol || '').toUpperCase();
  const letter = sym.slice(0, 1) || '?';
  const logo = token?.logoURI || token?.marketData?.image || undefined;
  const amountLabel = tokenAmount.toLocaleString('en-US', {
    minimumFractionDigits: tokenAmount >= 1 ? 2 : 6,
    maximumFractionDigits: tokenAmount >= 1 ? 2 : 6,
  });

  const recap: TxRecapRow[] = [
    {
      label: 'Sent',
      value: `${amountLabel} ${sym}`,
      coin: { label: letter, uri: logo },
      sign: '−',
    },
    {
      label: 'To',
      value: recipientLabel || '—',
      coin: { label: (recipientLabel || '?').slice(0, 1).toUpperCase() },
      mono: true,
    },
  ];

  return (
    <TransactionSuccessCelebration
      open={open}
      onClose={() => onOpenChange(false)}
      type="send"
      eyebrow="Payment sent"
      heroLabel="You sent"
      heroAmount={tokenAmount}
      heroSymbol={sym}
      heroCoin={{ label: letter, uri: logo }}
      heroSub={`${recipientLabel ? `to ${recipientLabel}` : ''}${
        usdAmount ? `${recipientLabel ? ' · ' : ''}≈ $${usdAmount.toFixed(2)}` : ''
      }`}
      recap={recap}
      conf="Confirmed"
      hashLabel={hashLabel}
      explorerUrl={explorerUrl}
      notionalUsd={usdAmount}
      shareText="Just sent money on Swop"
    />
  );
}
