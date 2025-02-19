'use client';

import {
  usePrivy,
  useLogout,
  useLoginWithEmail,
} from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { Card } from '@/components/ui/card';
import Loader from '@/components/loading/Loader';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import astronot from '@/public/onboard/astronot.svg';
import bluePlanet from '@/public/onboard/blue-planet.svg';
import yellowPlanet from '@/public/onboard/yellow-planet.svg';
import { WalletItem } from '@/types/wallet';
import { createLoginWalletBalance } from '@/actions/createWallet';
import { Input } from '@/components/ui/input';

const Login: React.FC = () => {
  const { authenticated, ready, user } = usePrivy();
  const { logout } = useLogout();
  const router = useRouter();
  const loginInitiated = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [walletData, setWalletData] = useState<WalletItem[] | null>(
    null
  );

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  // Memoize wallet data transformation
  const processWalletData = useCallback((user: any) => {
    return user?.linkedAccounts
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
  }, []);

  // Memoize email extraction
  const extractEmail = useCallback((user: any) => {
    return (
      user.google?.email ||
      user.email?.address ||
      user.linkedAccounts.find(
        (account: any) => account.type === 'email'
      )?.address ||
      user.linkedAccounts.find(
        (account: any) => account.type === 'google_oauth'
      )?.email
    );
  }, []);

  // Memoize API URL
  const apiUrl = useMemo(
    () => `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/`,
    []
  );

  const handleUserVerification = useCallback(
    async (user: any) => {
      try {
        setIsLoading(true);
        const email = extractEmail(user);
        if (!email) {
          router.push('/onboard');
          return;
        }

        const response = await fetch(`${apiUrl}${email}`, {
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (!response.ok) {
          router.push('/onboard');
          return;
        }

        const payload = {
          userId: data.user._id,
          ethAddress: walletData?.find((wallet) => wallet?.isEVM)
            ?.address,
          solanaAddress: walletData?.find((wallet) => !wallet?.isEVM)
            ?.address,
        };

        setIsRedirecting(true);
        await createLoginWalletBalance(payload);
        router.push('/');
      } catch (error) {
        console.error('Error verifying user:', error);
        router.push('/onboard');
      } finally {
        loginInitiated.current = false;
        setIsLoading(false);
      }
    },
    [apiUrl, extractEmail, router, walletData]
  );

  // Privy
  const { state, sendCode, loginWithCode } = useLoginWithEmail();

  useEffect(() => {
    if (authenticated && ready && user) {
      const processedWalletData = processWalletData(user);
      setWalletData(processedWalletData);
    }
  }, [authenticated, ready, user, processWalletData]);

  useEffect(() => {
    const privyToken = document.cookie.includes('privy-token');
    const privyIdToken = document.cookie.includes('privy-id-token');

    if ((!privyToken || !privyIdToken) && authenticated) {
      setIsLoggingOut(true);
      logout();
    }
  }, [authenticated, logout]);

  // Effect for handling OTP completion
  useEffect(() => {
    if (
      (state.status === 'initial' || state.status === 'done') &&
      user
    ) {
      handleUserVerification(user);
    }
  }, [state, user, handleUserVerification]);

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.currentTarget.value);
    },
    []
  );

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCode(e.currentTarget.value);
    },
    []
  );

  const handleSendCode = useCallback(() => {
    sendCode({ email });
  }, [email, sendCode]);

  const handleSubmitCode = useCallback(() => {
    loginWithCode({ code });
  }, [code, loginWithCode]);

  console.log('state', state);
  console.log('user', user);

  if (!user) {
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
                <span className="text-4xl font-semibold">SWOP</span>
              </div>
            </div>

            {!user &&
              (state.status === 'initial' ||
                state.status === 'sending-code' ||
                state.status === 'done') && (
                <div className="flex flex-col gap-4">
                  <Input
                    className="border border-slate-600"
                    onChange={handleEmailChange}
                    value={email}
                  />
                  <Button
                    className="py-4 rounded-xl text-md font-normal px-6"
                    onClick={handleSendCode}
                    disabled={state.status === 'sending-code'}
                  >
                    Send Code
                  </Button>
                  {state.status === 'sending-code' && (
                    <span>Sending Code...</span>
                  )}
                </div>
              )}

            {(state.status === 'awaiting-code-input' ||
              state.status === 'submitting-code') && (
              <div className="flex flex-col gap-4">
                <Input onChange={handleCodeChange} value={code} />
                <Button
                  className="border border-slate-600"
                  disabled={state.status !== 'awaiting-code-input'}
                  onClick={handleSubmitCode}
                >
                  Enter OTP
                </Button>
                {state.status === 'submitting-code' && (
                  <span>Logging in...</span>
                )}
              </div>
            )}

            {state.status === 'error' && (
              <span className="text-red-400">Invalid OTP</span>
            )}
          </div>
        </Card>
      </div>
    );
  }

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
};

export default Login;
