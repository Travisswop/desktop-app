'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

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

const clearAllCookies = () => {
  const cookies = [
    'privy-token',
    'privy-id-token',
    'privy-refresh-token',
    'access-token',
    'user-id',
  ];

  cookies.forEach((cookie) => {
    document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict`;
  });
};

export function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user: privyUser, ready } = usePrivy();
  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const email = useMemo(() => {
    if (!privyUser) return null;
    return (
      privyUser.google?.email ||
      privyUser.email?.address ||
      privyUser.linkedAccounts?.find(
        (account) => account.type === 'email'
      )?.address ||
      privyUser.linkedAccounts?.find(
        (account) => account.type === 'google_oauth'
      )?.email
    );
  }, [privyUser]);

  const fetchUserData = useCallback(
    async (userEmail: string) => {
      if (!userEmail) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/${userEmail}`
        );

        if (!response.ok) {
          clearAllCookies();
          router.push('/login');
          throw new Error(
            `Failed to fetch user data: ${response.statusText}`
          );
        }

        const data = await response.json();

        const { user: userData, token } = data;

        if (!userData || !token) {
          throw new Error('Invalid response data');
        }

        setUser(userData);
        setAccessToken(token);
        document.cookie = `access-token=${token}; path=/; secure; samesite=strict; max-age=86400`; // 24 hours
        document.cookie = `user-id=${userData._id}; path=/; secure; samesite=strict; max-age=86400`;
        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(
          err instanceof Error ? err : new Error('Unknown error')
        );
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (ready && email) {
      fetchUserData(email);
    } else if (ready && !email) {
      setLoading(false);
    }
  }, [ready, email, fetchUserData]);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      error,
      refreshUser: () => fetchUserData(email || ''),
      clearCache: () => {
        setUser(null);
        setAccessToken(null);
        clearAllCookies();
      },
      accessToken,
    }),
    [user, loading, error, fetchUserData, email, accessToken]
  );

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
