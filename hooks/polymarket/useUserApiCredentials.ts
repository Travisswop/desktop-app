import { useCallback } from 'react';
import { usePolymarketWallet } from '@/providers/polymarket';
import { pmApi } from '@/lib/polymarket/polymarketApi';

export interface UserApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

// Derives Polymarket L2 API credentials by signing an EIP-712 message via
// the polymarket-backend — no SDK required on the client.

export function useUserApiCredentials() {
  const { eoaAddress, walletClient } = usePolymarketWallet();

  const createOrDeriveUserApiCredentials =
    useCallback(async (): Promise<UserApiCredentials> => {
      if (!eoaAddress || !walletClient)
        throw new Error('Wallet not connected');

      // 1. Fetch EIP-712 typed data from backend
      const { typedData, timestamp, nonce } = await pmApi<{
        typedData: {
          domain: any;
          types: any;
          primaryType: string;
          message: any;
        };
        timestamp: string;
        nonce: number;
      }>(`/session/credential-typed-data?eoaAddress=${eoaAddress}`);

      // 2. Sign with wallet
      const signature = await walletClient.signTypedData({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType as any,
        message: typedData.message,
      });

      // 3. Derive credentials
      const creds = await pmApi<UserApiCredentials>('/session/credentials', {
        method: 'POST',
        body: JSON.stringify({ eoaAddress, signature, timestamp, nonce }),
      });

      if (!creds?.key || !creds?.secret || !creds?.passphrase) {
        throw new Error('Failed to derive valid API credentials');
      }

      return creds;
    }, [eoaAddress, walletClient]);

  return { createOrDeriveUserApiCredentials };
}
