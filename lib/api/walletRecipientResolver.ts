import type { ReceiverData } from '@/types/wallet';
import { apiFetch } from './apiFetch';
import { buildSwopApiUrl } from './apiBaseUrl';

type ResolvedWalletRecipientPayload = {
  address?: string;
  ensName?: string;
  label?: string;
  displayName?: string;
  avatar?: string;
  source?: string;
};

export async function resolveWalletRecipientViaBackend({
  recipientValue,
  chain,
  accessToken,
}: {
  recipientValue: string;
  chain?: string | number | null;
  accessToken?: string | null;
}): Promise<ReceiverData | null> {
  if (!accessToken) return null;

  const response = await apiFetch(
    buildSwopApiUrl('/api/v5/wallet/resolve-recipient'),
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient: recipientValue,
        chain,
      }),
    },
  ).catch(() => null);

  if (!response || response.status === 404) return null;

  const payload = await response.json().catch(() => null);
  const data = payload?.data as ResolvedWalletRecipientPayload | undefined;
  if (!response.ok || !payload?.success || !data?.address) return null;

  const resolvedName =
    data.ensName || data.label || data.displayName || recipientValue;

  return {
    address: data.address,
    ensName: data.source === 'address' ? undefined : resolvedName,
    isEns: data.source !== 'address',
    avatar: data.avatar,
  };
}
