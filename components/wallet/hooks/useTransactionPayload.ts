import { useState, useEffect } from 'react';

const INITIAL_PAYLOAD = {
  smartsiteId: '',
  userId: '',
  smartsiteUserName: '',
  smartsiteEnsName: '',
  smartsiteProfilePic: '',
  postType: 'transaction' as const,
  content: {
    transaction_type: 'token' as const,
    sender_ens: '',
    sender_wallet_address: '',
    receiver_ens: '',
    receiver_wallet_address: '',
    amount: 0,
    currency: 'ETH',
    transaction_hash: '',
  },
};

// Custom hook for transaction payload management
export const useTransactionPayload = (user: any) => {
  const [payload, setPayload] = useState(INITIAL_PAYLOAD);

  useEffect(() => {
    if (!user) return;

    const primaryMicrositeData = user.microsites?.find(
      (microsite: any) => microsite.primary
    );

    setPayload((prev) => ({
      ...prev,
      smartsiteId: user.primaryMicrosite || '',
      userId: user._id || '',
      smartsiteUserName: primaryMicrositeData?.name || '',
      smartsiteEnsName:
        primaryMicrositeData?.ens ||
        primaryMicrositeData?.ensData?.ens ||
        '',
      smartsiteProfilePic: primaryMicrositeData?.profilePic || '',
    }));
  }, [user]);

  return { payload, setPayload };
};
