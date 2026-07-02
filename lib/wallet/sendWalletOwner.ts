import type { SendFlowState } from '@/types/wallet-types';

type AddressLike = {
  address?: string | null;
};

type EvmWalletLike = AddressLike & {
  walletClientType?: string | null;
  connectorType?: string | null;
};

export type EvmEmbeddedSenderResolution = {
  address: string;
  tokenOwnerAddress: string;
  tokenOwnerUnavailable: boolean;
};

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export const cleanSendWalletAddress = (address?: string | null) =>
  typeof address === 'string' ? address.trim() : '';

export const isEvmWalletAddress = (address?: string | null) =>
  EVM_ADDRESS_RE.test(cleanSendWalletAddress(address));

export function walletAddressesMatch(
  left?: string | null,
  right?: string | null,
) {
  const cleanLeft = cleanSendWalletAddress(left);
  const cleanRight = cleanSendWalletAddress(right);
  if (!cleanLeft || !cleanRight) return false;
  if (isEvmWalletAddress(cleanLeft) && isEvmWalletAddress(cleanRight)) {
    return cleanLeft.toLowerCase() === cleanRight.toLowerCase();
  }
  return cleanLeft === cleanRight;
}

export function getSendTokenOwnerAddress(flow: SendFlowState) {
  return cleanSendWalletAddress(flow.token?.walletAddress);
}

export function getEvmSenderAddressForSend(
  flow: SendFlowState,
  fallbackAddress?: string | null,
) {
  const tokenOwner = getSendTokenOwnerAddress(flow);
  if (isEvmWalletAddress(tokenOwner)) return tokenOwner;
  const fallback = cleanSendWalletAddress(fallbackAddress);
  return isEvmWalletAddress(fallback) ? fallback : '';
}

export function isEmbeddedEvmSendWallet(wallet: EvmWalletLike) {
  return (
    wallet.walletClientType === 'privy' ||
    wallet.walletClientType === 'privy-v2' ||
    wallet.connectorType === 'embedded'
  );
}

export function resolveEvmEmbeddedSenderForSend<T extends EvmWalletLike>(
  wallets: T[] | undefined | null,
  flow: SendFlowState,
  fallbackAddress?: string | null,
): EvmEmbeddedSenderResolution {
  const embeddedWallets = (wallets ?? []).filter(
    (wallet) =>
      isEmbeddedEvmSendWallet(wallet) &&
      isEvmWalletAddress(wallet.address),
  );
  const findEmbeddedWallet = (address?: string | null) =>
    embeddedWallets.find((wallet) =>
      walletAddressesMatch(wallet.address, address),
    );

  const tokenOwner = getSendTokenOwnerAddress(flow);
  if (isEvmWalletAddress(tokenOwner)) {
    const ownerWallet = findEmbeddedWallet(tokenOwner);
    return {
      address: cleanSendWalletAddress(ownerWallet?.address),
      tokenOwnerAddress: tokenOwner,
      tokenOwnerUnavailable: !ownerWallet,
    };
  }

  const fallback = cleanSendWalletAddress(fallbackAddress);
  const fallbackWallet = isEvmWalletAddress(fallback)
    ? findEmbeddedWallet(fallback)
    : undefined;
  return {
    address: cleanSendWalletAddress(
      fallbackWallet?.address ?? embeddedWallets[0]?.address,
    ),
    tokenOwnerAddress: '',
    tokenOwnerUnavailable: false,
  };
}

export function selectSolanaWalletForSend<T extends AddressLike>(
  wallets: T[] | undefined | null,
  flow: SendFlowState,
  fallbackWallet?: T,
) {
  const tokenOwner = getSendTokenOwnerAddress(flow);
  const available = (wallets ?? []).filter((wallet) =>
    cleanSendWalletAddress(wallet.address),
  );
  if (tokenOwner) {
    const ownerWallet = available.find((wallet) =>
      walletAddressesMatch(wallet.address, tokenOwner),
    );
    if (ownerWallet) return ownerWallet;
  }
  return fallbackWallet ?? available[0];
}
