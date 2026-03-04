import { useState, useCallback, useEffect } from 'react';
import { usePolymarketWallet } from '@/providers/polymarket';
import { pmApi } from '@/lib/polymarket/polymarketApi';

export function useSafeDeployment(eoaAddress?: string) {
  const { walletClient, publicClient } = usePolymarketWallet();
  const [derivedSafeAddressFromEoa, setDerivedSafeAddressFromEoa] = useState<
    string | undefined
  >();

  // Fetch deterministic Safe address from the backend (pure computation)
  useEffect(() => {
    if (!eoaAddress) {
      setDerivedSafeAddressFromEoa(undefined);
      return;
    }

    pmApi<{ safeAddress: string }>(`/safe-address?eoa=${eoaAddress}`)
      .then(({ safeAddress }) => setDerivedSafeAddressFromEoa(safeAddress))
      .catch(() => setDerivedSafeAddressFromEoa(undefined));
  }, [eoaAddress]);

  // Check Safe deployment status via on-chain RPC
  const isSafeDeployed = useCallback(
    async (safeAddr: string): Promise<boolean> => {
      try {
        const code = await publicClient?.getCode({
          address: safeAddr as `0x${string}`,
        });
        return !!code && code !== '0x';
      } catch {
        return false;
      }
    },
    [publicClient],
  );

  // Deploy Safe: get typed data → sign → submit
  const deploySafe = useCallback(async (): Promise<string> => {
    if (!eoaAddress || !walletClient)
      throw new Error('Wallet not connected');

    const { typedData, safeAddress } = await pmApi<{
      typedData: {
        domain: any;
        types: any;
        primaryType: string;
        message: any;
      };
      safeAddress: string;
    }>(`/session/deploy-typed-data?eoaAddress=${eoaAddress}`);

    const signature = await walletClient.signTypedData({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType as any,
      message: typedData.message,
    });

    const result = await pmApi<{ deployed: boolean; safeAddress: string }>(
      '/session/deploy-safe',
      {
        method: 'POST',
        body: JSON.stringify({ eoaAddress, signature }),
      },
    );

    if (!result.deployed) throw new Error('Safe deployment failed');
    return result.safeAddress ?? safeAddress;
  }, [eoaAddress, walletClient]);

  return { derivedSafeAddressFromEoa, isSafeDeployed, deploySafe };
}
