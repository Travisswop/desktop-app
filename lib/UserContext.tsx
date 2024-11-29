'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useAuth } from './hooks/useAuth';
import { useRouter } from 'next/navigation';

export interface UserData {
  _id: string;
  address?: string;
  apt?: string;
  bio?: string;
  countryCode?: string;
  countryFlag?: string;
  dob?: string;
  email: string;
  isPremiumUser?: boolean;
  mobileNo?: string;
  name: string;
  profilePic?: string;
  microsites?: any[];
  subscribers: any[];
  followers: number;
  following: number;
  ensName?: string;
}

interface UserContextType {
  user: UserData | null;
  accessToken: string | null;
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  clearCache: () => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  accessToken: null,
  loading: true,
  error: null,
  refreshUser: async () => {},
  clearCache: () => {},
});

export function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user: privyUser, ready } = useAuth();
  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
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
    async (email: string) => {
      try {
        const response = await fetch(`/api/user/${email}`);
        if (!response.ok) {
          // Clear cookies
          document.cookie =
            'privy-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie =
            'privy-id-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie =
            'privy-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie =
            'access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie =
            'user-id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

          router.push('/login');
          throw new Error('Failed to fetch user data');
        }

        const { user, token } = await response.json();
        setUser(user);
        setAccessToken(token);
        document.cookie = `access-token=${token}; path=/; secure; samesite=strict`;
        document.cookie = `user-id=${user._id}; path=/; secure; samesite=strict`;
        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(
          err instanceof Error ? err : new Error('Unknown error')
        );
        setUser(null);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (ready && email) {
      fetchUserData(email);
    }
  }, [ready, email, fetchUserData]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        error,
        refreshUser: () => fetchUserData(email || ''),
        clearCache: () => {
          setUser(null);
          setAccessToken(null);
        },
        accessToken,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
