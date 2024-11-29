'use client';

import { usePrivy, useLogin, useLogout } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import RotateEarth from '@/components/rotating-earth';
import Loader from '@/components/loading/Loader';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import astronot from '@/public/onboard/astronot.svg';
import bluePlanet from '@/public/onboard/blue-planet.svg';
import yellowPlanet from '@/public/onboard/yellow-planet.svg';

const Login: React.FC = () => {
  const { ready, authenticated, getAccessToken } = usePrivy();

  const router = useRouter();
  const loginInitiated = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { login } = useLogin({
    onComplete: async (user) => {
      console.log('🚀 ~ onComplete: ~ user:', user);
      const email =
        user.google?.email ||
        user.email?.address ||
        user.linkedAccounts.find(
          (account) => account.type === 'email'
        )?.address ||
        user.linkedAccounts.find(
          (account) => account.type === 'google_oauth'
        )?.email;

      if (!email) {
        console.log('No email found, redirecting to onboard');
        loginInitiated.current = false;
        router.push('/onboard');
        return;
      }

      setSuccess(true);

      try {
        const token = await getAccessToken();
        const response = await fetch('/api/auth/verify-user', {
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
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      loginInitiated.current = false;
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (ready && !authenticated && !loginInitiated.current) {
      loginInitiated.current = true;
      handleLogin();
    }
  }, [ready, authenticated]);

  const handleLogin = () => {
    setIsLoading(true);
    login();
  };

  if (!ready) {
    return <Loader />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (!success) {
    return (
      <div className="relative w-full max-w-2xl mx-auto p-8">
        <div className="absolute -top-20 left-0 w-32 h-32 animate-float">
          <Image
            src={astronot}
            alt="astronot image"
            className="w-48 h-auto"
          />
        </div>
        <div className="absolute -top-20 right-0 w-32 h-32 ">
          <Image
            src={yellowPlanet}
            alt="astronot image"
            className="w-48 h-auto"
          />
        </div>
        <div className="absolute -bottom-20 left-8 w-24 h-24 ">
          <Image
            src={bluePlanet}
            alt="astronot image"
            className="w-56 h-auto"
          />
        </div>
        <Card className="relative w-full bg-white/80 backdrop-blur-sm shadow-xl rounded-3xl p-16 max-w-md mx-auto">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-black" />
                    <span className="text-4xl font-semibold">
                      privy
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full py-6 rounded-full relative text-lg font-normal justify-between px-6"
              onClick={handleLogin}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
                Login with Privy
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }
};
export default Login;
