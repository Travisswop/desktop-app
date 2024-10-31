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
      if (!user.email) {
        router.replace('/onboard');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getAccessToken()}`,
          },
          body: JSON.stringify({
            email: user.email.address,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          router.replace('/onboard');
          return;
        }

        // User exists, redirect to home
        router.replace('/');
      } catch (error) {
        loginInitiated.current = false;
        console.error('Error verifying user:', error);
        alert('Login verification failed. Please try again.');
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      loginInitiated.current = false;
      alert('Login failed. Please try again.');
    },
  });

  // Auto-initiate login when component mounts
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
