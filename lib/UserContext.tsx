'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useAuth } from './hooks/useAuth';

interface UserData {
  _id: string;
  email: string;
  name: string;
  mobileNo?: string;
  profilePic?: string;
  address?: string;
  connections: {
    followers: string[];
    following: string[];
  };
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

  const fetchUserData = useCallback(async (email: string) => {
    try {
      const response = await fetch(`/api/user/${email}`);
      if (!response.ok) throw new Error('Failed to fetch user data');

      const { user, token } = await response.json();
      setUser(user);
      setAccessToken(token);
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
  }, []);

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
