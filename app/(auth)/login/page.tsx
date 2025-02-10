'use client';

import { usePrivy, useLogin, useLogout } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import Loader from '@/components/loading/Loader';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import astronot from '@/public/onboard/astronot.svg';
import bluePlanet from '@/public/onboard/blue-planet.svg';
import yellowPlanet from '@/public/onboard/yellow-planet.svg';
import { WalletItem } from '@/types/wallet';

const Login: React.FC = () => {
  const { authenticated, ready, user: PrivyUser } = usePrivy();
  console.log('privyuser', PrivyUser);
  const { logout } = useLogout();
  const router = useRouter();
  const loginInitiated = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [walletData, setWalletData] = useState<WalletItem[] | null>(
    null
  );
  useEffect(() => {
    if (authenticated && ready && PrivyUser) {
      const linkWallet = PrivyUser?.linkedAccounts
        .map((item: any) => {
          if (item.chainType === 'ethereum') {
            return {
              address: item.address,
              isActive:
                item.walletClientType === 'privy' ||
                item.connectorType === 'embedded',
              isEVM: true,
              walletClientType: item.walletClientType,
            };
          } else if (item.chainType === 'solana') {
            return {
              address: item.address,
              isActive:
                item.walletClientType === 'privy' ||
                item.connectorType === 'embedded',
              isEVM: false,
              walletClientType: item.walletClientType,
            };
          }
          return null;
        })
        .filter(Boolean);

      setWalletData(linkWallet as WalletItem[]);
    }
  }, [PrivyUser, authenticated, ready]);

  const { login } = useLogin({
    onComplete: async (user) => {
      try {
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
          router.push('/onboard');
          return;
        }
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/${email}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(walletData),
          }
        );

        if (!response.ok) {
          console.log('User not found, redirecting to onboard');
          router.push('/onboard');
          return;
        }

        console.log('User found, redirecting to home');
        setIsRedirecting(true);
        router.push('/');
      } catch (error) {
        console.error('Error verifying user:', error);
        router.push('/onboard');
      } finally {
        loginInitiated.current = false;
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      loginInitiated.current = false;
      setIsLoading(false);
    },
  });

  useEffect(() => {
    // Check for privy tokens in cookies
    const privyToken = document.cookie.includes('privy-token');
    const privyIdToken = document.cookie.includes('privy-id-token');

    // If tokens not found but user is authenticated, log them out
    if ((!privyToken || !privyIdToken) && authenticated) {
      setIsLoggingOut(true);
      logout().then(() => {
        login();
      });
    }
  }, [authenticated, login, logout]);

  // Auto-trigger login when component mounts
  useEffect(() => {
    if (ready && !authenticated && !loginInitiated.current) {
      handleLogin();
    }
  }, [ready, authenticated]);

  const handleLogin = () => {
    if (loginInitiated.current) return;

    try {
      setIsLoading(true);
      loginInitiated.current = true;
      login();
    } catch (error) {
      console.error('Handle login error:', error);
      loginInitiated.current = false;
      setIsLoading(false);
    }
  };

  if (!ready || isLoggingOut || isRedirecting) {
    return <Loader />;
  }

  if (isLoading || loginInitiated.current) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto p-8">
      <div className="absolute -top-20 left-0 w-32 h-32 animate-float">
        <Image
          src={astronot}
          alt="astronot image"
          className="w-48 h-auto"
          priority
        />
      </div>
      <div className="absolute -top-20 right-0 w-32 h-32">
        <Image
          src={yellowPlanet}
          alt="yellow planet"
          className="w-48 h-auto"
          priority
        />
      </div>
      <div className="absolute -bottom-20 left-8 w-24 h-24">
        <Image
          src={bluePlanet}
          alt="blue planet"
          className="w-56 h-auto"
          priority
        />
      </div>
      <Card className="relative w-full bg-white/80 backdrop-blur-sm shadow-xl rounded-3xl p-16 max-w-md mx-auto">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-black" />
              <span className="text-4xl font-semibold">privy</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full py-6 rounded-full relative text-lg font-normal justify-between px-6"
            onClick={handleLogin}
            disabled={isLoading}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-sm">👤</span>
              </div>
              {isLoading ? 'Logging in...' : 'Login with Privy'}
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Login;
