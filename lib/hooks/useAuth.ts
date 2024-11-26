// lib/auth-hook.ts
import { AuthState } from '@/types/auth';
import { useEffect, useState } from 'react';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    ready: false,
  });

  useEffect(() => {
    // Load auth state from cookies or local storage
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
          method: 'POST',
        });

        if (response.ok) {
          const data = await response.json();
          setAuthState({
            user: data.user,
            ready: true,
          });
        } else {
          setAuthState({
            user: null,
            ready: true,
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthState({
          user: null,
          ready: true,
        });
      }
    };

    checkAuth();
  }, []);

  return authState;
}
