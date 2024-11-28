import { useQuery } from '@tanstack/react-query';

export interface PeerData {
  bio: string;
  ens: string;
  ensData: {
    addresses: {
      [key: number]: string;
    };
    createdAt: string;
    name: string;
    owner: string;
    texts: {
      avatar: string;
    };
    updatedAt: string;
  };
  ethAddress: string;
  name: string;
  profilePic: string;
  profileUrl: string;
  _id: string;
}
async function fetchPeerData(
  peerAddresses: string[]
): Promise<PeerData[]> {
  if (peerAddresses.length === 0) {
    return []; // Return empty array if no addresses
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/getPeerData`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ peerAddresses }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch peer data');
  }

  const { data } = await response.json();
  return data;
}

export const usePeerData = (peerAddressList: string[]) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['peerData', peerAddressList],
    queryFn: () => fetchPeerData(peerAddressList),
    enabled: peerAddressList.length > 0,
  });

  return {
    peerData: data || [],
    isLoading,
    error,
  };
};
