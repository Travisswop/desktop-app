import { useEffect } from 'react';
import { useTrading } from '@/providers/polymarket';
import { usePolygonBalances } from './usePolygonBalances';
import { useRedeemPosition } from './useRedeemPosition';

const LEGACY_COLLATERAL_DUST = 0.005;
const attemptedNormalizations = new Set<string>();

function firstAddress(address: string | string[] | undefined) {
  return Array.isArray(address) ? address[0] : address;
}

export function usePolymarketCollateralBalance(
  address: string | string[] | undefined,
) {
  const balances = usePolygonBalances(address);
  const {
    safeAddress,
    depositWalletAddress,
    walletType,
  } = useTrading();
  const {
    isNormalizingCollateral,
    normalizeLegacyUsdcBalance,
  } = useRedeemPosition();

  const normalizationAddress =
    walletType === 'deposit'
      ? depositWalletAddress ?? firstAddress(address) ?? safeAddress
      : safeAddress ?? firstAddress(address);
  const hasLegacyCollateral =
    balances.legacyUsdcBalance > LEGACY_COLLATERAL_DUST;

  useEffect(() => {
    if (
      balances.isLoading ||
      !normalizationAddress ||
      !hasLegacyCollateral
    ) {
      return;
    }

    const key = `${normalizationAddress.toLowerCase()}:${balances.legacyUsdcBalance.toFixed(6)}`;
    if (attemptedNormalizations.has(key)) return;
    attemptedNormalizations.add(key);

    void normalizeLegacyUsdcBalance({
      safeAddress: walletType === 'safe' ? normalizationAddress : undefined,
      depositWalletAddress:
        walletType === 'deposit' ? normalizationAddress : undefined,
      walletType,
      destinationAddress: normalizationAddress,
      amount: balances.legacyUsdcBalance,
      silentOnly: walletType === 'deposit',
    }).catch((error) => {
      attemptedNormalizations.delete(key);
      console.warn('[Polymarket] legacy USDC.e normalization failed', {
        message: error instanceof Error ? error.message : String(error),
        normalizationAddress,
        walletType,
        legacyUsdcBalance: balances.legacyUsdcBalance,
      });
    });
  }, [
    balances.isLoading,
    balances.legacyUsdcBalance,
    hasLegacyCollateral,
    normalizeLegacyUsdcBalance,
    normalizationAddress,
    walletType,
  ]);

  const legacyBalanceHint = hasLegacyCollateral
    ? isNormalizingCollateral
      ? `converting $${balances.legacyUsdcBalance.toFixed(2)} USDC.e to pUSD`
      : `$${balances.legacyUsdcBalance.toFixed(2)} USDC.e converting to pUSD`
    : undefined;

  // Everything on predictions is denominated in pUSD. Legacy USDC.e is never
  // summed into balances — it is only surfaced separately (legacyUsdcBalance /
  // legacyBalanceHint) while auto-conversion or withdrawal drains it.
  return {
    ...balances,
    orderableBalance: balances.usdcBalance,
    hasLegacyCollateral,
    legacyBalanceHint,
    isNormalizingCollateral,
  };
}
