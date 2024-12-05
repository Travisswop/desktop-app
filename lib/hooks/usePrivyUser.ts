import { usePrivy } from '@privy-io/react-auth';
import { useMemo } from 'react';

export const usePrivyUser = () => {
  const { authenticated, ready, user } = usePrivy();

  return useMemo(
    () => ({
      isAuthenticated: authenticated,
      isReady: ready,
      user,
    }),
    [authenticated, ready, user]
  );
};
