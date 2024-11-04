'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface UserData {
  id: string;
  email: string;
  name?: string;
  mobileNo?: string;
  profilePic?: string;
  // Add other user fields as needed
}

interface UserContextType {
  user: UserData | null;
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  error: null,
  refreshUser: async () => {},
});

// Create a cache to store user data
const userCache = new Map<
  string,
  { data: UserData; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: privyUser, ready } = usePrivy();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const email =
    privyUser?.google?.email ||
    privyUser?.email?.address ||
    privyUser?.linkedAccounts.find(
      (account) => account.type === 'email'
    )?.address ||
    privyUser?.linkedAccounts.find(
      (account) => account.type === 'google_oauth'
    )?.email;

  const fetchUserData = useCallback(
    async (email: string, force = false) => {
      // Check cache first
      const now = Date.now();
      const cachedData = userCache.get(email);

      if (
        !force &&
        cachedData &&
        now - cachedData.timestamp < CACHE_DURATION
      ) {
        setUser(cachedData.data);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/user/${email}`);
        if (!response.ok)
          throw new Error('Failed to fetch user data');

        const { user } = await response.json();

        // Update cache
        userCache.set(email, { data: user, timestamp: now });

        setUser(user);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Unknown error')
        );
        setUser(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (ready && email) {
      fetchUserData(email);
    }
  }, [ready, email, fetchUserData]);

  // Clean up expired cache entries
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of userCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          userCache.delete(key);
        }
      }
    }, CACHE_DURATION);

    return () => clearInterval(cleanup);
  }, []);

  const refreshUser = async () => {
    if (!privyUser?.email?.address) return;
    setLoading(true);
    await fetchUserData(privyUser.email.address, true); // Force refresh
  };

  return (
    <UserContext.Provider
      value={{ user, loading, error, refreshUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
