import { usePrivy } from '@privy-io/react-auth';

export function useUser() {
  const { user, authenticated, ready } = usePrivy();

  return {
    user,
    isAuthenticated: authenticated,
    ready: ready,
  };
}
