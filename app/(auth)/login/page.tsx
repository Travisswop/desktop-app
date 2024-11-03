'use client';

import { usePrivy, useLogin } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useRef } from 'react';

const Login: React.FC = () => {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const loginInitiated = useRef(false);

  const { login } = useLogin({
    onComplete: async (user) => {
      console.log('🚀 ~ onComplete: ~ user:', user);
      const email =
        user.google?.email ||
        user.email?.address ||
        user.linkedAccounts.find(
          (account) => account.type === 'email'
        )?.address;

      if (!email) {
        console.log('No email found, redirecting to onboard');
        loginInitiated.current = false;
        router.push('/onboard');
        return;
      }

      try {
        const token = await getAccessToken();
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: email,
            userId: user.id,
          }),
        });

        console.log('Verify response:', response.status);

        if (!response.ok) {
          console.log('User not found, redirecting to onboard');
          loginInitiated.current = false;
          router.push('/onboard');
          return;
        }

        console.log('User found, redirecting to home');
        router.push('/');
      } catch (error) {
        console.error('Error verifying user:', error);
        loginInitiated.current = false;
        router.push('/onboard');
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      loginInitiated.current = false;
      alert('Login failed. Please try again.');
    },
  });

  useEffect(() => {
    if (ready && !authenticated && !loginInitiated.current) {
      loginInitiated.current = true;
      login();
    }
  }, [ready, authenticated, login]);

  if (!ready) {
    return <LoginSkeleton />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Welcome</h1>
        <p className="mb-4">Initiating login...</p>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
};

function LoginSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default Login;
