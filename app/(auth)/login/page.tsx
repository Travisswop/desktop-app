'use client';

import { createLoginWalletBalance } from '@/actions/createWallet';
import Loader from '@/components/loading/Loader';
import { Card } from '@/components/ui/card';
import astronot from '@/public/onboard/astronot.svg';
import blackPlanet from '@/public/onboard/black-planet.svg';
import swopLogo from '@/public/swopLogo.png';
import { WalletItem } from '@/types/wallet';
import {
  useCreateWallet,
  useLoginWithEmail,
  useLogout,
  usePrivy,
} from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GoArrowLeft } from 'react-icons/go';
import { LuArrowRight } from 'react-icons/lu';
import { RiMailSendLine } from 'react-icons/ri';
import Cookies from 'js-cookie';

const Login: React.FC = () => {
  const { authenticated, ready, user } = usePrivy();

  const { logout } = useLogout();
  const router = useRouter();
  const loginInitiated = useRef(false);

  // Redirect authenticated users away from the login page
  useEffect(() => {
    if (
      authenticated &&
      ready &&
      user &&
      !loginInitiated.current &&
      !isLoading &&
      !isRedirecting
    ) {
      router.push('/');
    }
  }, [authenticated, ready, user, isLoading, isRedirecting, router]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [walletData, setWalletData] = useState<WalletItem[] | null>(
    null
  );
  const [walletsCreated, setWalletsCreated] = useState({
    ethereum: false,
    solana: false,
  });

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [activeModal, setActiveModal] = useState('email');
  const [checkEmailValidation, setCheckEmailValidation] =
    useState('');

  const otpLength = 6;
  const [otp, setOtp] = useState(new Array(otpLength).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(
    new Array(otpLength).fill(null)
  );

  // Add a state to track errors
  const [loginError, setLoginError] = useState<string | null>(null);

  // Handle typing in OTP fields
  const handleChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < otpLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace to move focus to previous field
  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting OTP
  const handlePaste = (
    event: React.ClipboardEvent<HTMLInputElement>
  ) => {
    const pasteData = event.clipboardData
      .getData('text')
      .slice(0, otpLength)
      .split('');
    if (pasteData.some((char) => isNaN(Number(char)))) return;

    setOtp([
      ...pasteData,
      ...new Array(otpLength - pasteData.length).fill(''),
    ]);

    pasteData.forEach((char, index) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index]!.value = char;
      }
    });

    inputRefs.current[
      Math.min(pasteData.length, otpLength - 1)
    ]?.focus();
  };

  // Memoize wallet data transformation
  const processWalletData = useCallback((user: any) => {
    return user?.linkedAccounts
      .filter(
        (item: any) =>
          (item.chainType === 'ethereum' ||
            item.chainType === 'solana') &&
          (item.walletClientType === 'privy' ||
            item.connectorType === 'embedded')
      )
      .map((item: any) => {
        if (item.chainType === 'ethereum') {
          return {
            address: item.address,
            isActive: true,
            isEVM: true,
            walletClientType: item.walletClientType,
          };
        } else if (item.chainType === 'solana') {
          return {
            address: item.address,
            isActive: true,
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

  const { createWallet: createEthereumWallet } = useCreateWallet();

  // Use the specific hook for Solana wallets
  const { wallets: solanaWallets, createWallet } = useSolanaWallets();

  // Track createWallet function separately
  const createSolanaWallet = useCallback(async () => {
    try {
      console.log('Attempting to create Solana wallet');

      // Check if there's already a Solana wallet
      if (solanaWallets && solanaWallets.length > 0) {
        console.log(
          'User already has a Solana wallet, skipping creation'
        );
        setWalletsCreated((prev) => ({ ...prev, solana: true }));
        return;
      }

      // Attempt to create the wallet with explicit error handling
      const result = await createWallet().catch((error) => {
        // Handle embedded_wallet_already_exists as a success case
        if (
          error === 'embedded_wallet_already_exists' ||
          (error &&
            typeof error === 'object' &&
            'message' in error &&
            error.message === 'embedded_wallet_already_exists')
        ) {
          console.log(
            'Solana wallet already exists, marking as created'
          );
          return { status: 'already_exists' };
        }
        // Rethrow other errors
        throw error;
      });

      console.log('Solana wallet creation result:', result);
      setWalletsCreated((prev) => ({ ...prev, solana: true }));
    } catch (error) {
      console.error(
        'Failed to create Solana wallet with error:',
        error
      );

      // Don't mark as created if there was a real error
      // This will allow the system to retry creation
    }
  }, [solanaWallets, createWallet]);

  // Function to create both Ethereum and Solana wallets
  const createPrivyWallets = useCallback(async () => {
    try {
      // Check if user already has wallets
      const hasEthereumWallet = user?.linkedAccounts.some(
        (account: any) =>
          account.chainType === 'ethereum' &&
          (account.walletClientType === 'privy' ||
            account.connectorType === 'embedded')
      );

      const hasSolanaWallet = user?.linkedAccounts.some(
        (account: any) =>
          account.chainType === 'solana' &&
          (account.walletClientType === 'privy' ||
            account.connectorType === 'embedded')
      );

      console.log('Wallet status:', {
        hasEthereumWallet,
        hasSolanaWallet,
        walletsCreated,
      });

      // Create Ethereum wallet if needed
      if (!hasEthereumWallet && !walletsCreated.ethereum) {
        try {
          console.log('Creating Ethereum wallet...');

          // Attempt to create the wallet with explicit error handling
          const result = await createEthereumWallet().catch(
            (error) => {
              // Handle embedded_wallet_already_exists as a success case
              if (
                error === 'embedded_wallet_already_exists' ||
                (error &&
                  typeof error === 'object' &&
                  'message' in error &&
                  error.message === 'embedded_wallet_already_exists')
              ) {
                console.log(
                  'Ethereum wallet already exists, marking as created'
                );
                return { status: 'already_exists' };
              }
              // Rethrow other errors
              throw error;
            }
          );

          console.log('Ethereum wallet creation result:', result);
          setWalletsCreated((prev) => ({ ...prev, ethereum: true }));
          console.log('Ethereum wallet creation complete');
        } catch (err) {
          console.error('Ethereum wallet creation error:', err);
          // Don't mark as created if there was a real error
        }
      }

      // Create Solana wallet if needed
      if (!hasSolanaWallet && !walletsCreated.solana) {
        try {
          console.log('Creating Solana wallet...');
          await createSolanaWallet();

          setWalletsCreated((prev) => ({ ...prev, solana: true }));
          console.log('Solana wallet creation complete');
        } catch (err) {
          console.error('Solana wallet creation error:', err);
        }
      }

      // Final status check
      console.log('Wallet creation status:', walletsCreated);
    } catch (error) {
      console.error('Error in wallet creation flow:', error);
      // Still mark wallets as attempted to prevent infinite loops
      setWalletsCreated({ ethereum: true, solana: true });
    }
  }, [
    createEthereumWallet,
    createSolanaWallet,
    user,
    walletsCreated,
  ]);

  const handleUserVerification = useCallback(
    async (user: any) => {
      console.log('🚀 ~ handleUserVerification ~ user:');
      // Early exit if already processing to prevent multiple calls
      if (loginInitiated.current || isLoading || isRedirecting) {
        console.log(
          'Verification already in progress, skipping duplicate call'
        );
        return;
      }

      loginInitiated.current = true;
      setLoginError(null); // Clear any previous errors

      try {
        setIsLoading(true);
        const email = extractEmail(user);

        if (!email) {
          console.log('No email found, redirecting to onboard');
          setLoginError(
            'No email found in your account. Please complete the onboarding process.'
          );
          setIsLoading(false);
          setTimeout(() => router.push('/onboard'), 2000);
          return;
        }

        // Attempt to create wallets first, regardless of user verification outcome
        console.log('Creating wallets for user...');
        try {
          await createPrivyWallets();
        } catch (error) {
          console.error('Error creating wallets:', error);
          // Continue despite wallet creation errors
        }

        console.log('Verifying user with API...');
        let response, data;
        try {
          response = await fetch(`${apiUrl}${email}`, {
            headers: { 'Content-Type': 'application/json' },
          });
          data = await response.json();
        } catch (error) {
          console.error('API connection error:', error);
          setLoginError(
            'Could not connect to our servers. Please try again later.'
          );
          setIsLoading(false);
          loginInitiated.current = false;
          return;
        }

        if (!response.ok) {
          console.log(
            'User verification failed, redirecting to onboard'
          );
          setLoginError(
            'Account verification failed. You need to complete the onboarding process.'
          );
          setIsLoading(false);
          setTimeout(() => router.push('/onboard'), 2000);
          return;
        }

        if (data?.user?._id) {
          console.log('Setting user ID cookie');
          Cookies.set('user-id', data?.user?._id.toString());
        } else {
          console.error('No user ID found in API response');
          setLoginError(
            'Something went wrong while setting up your account.'
          );
          setIsLoading(false);
          loginInitiated.current = false;
          return;
        }

        // Force wallet creation status to complete after 3 seconds
        const forceCompleteWallets = setTimeout(() => {
          setWalletsCreated({ ethereum: true, solana: true });
        }, 3000);

        // Use the wallet data we have at this point - don't wait forever
        console.log('Preparing wallet data for API...');
        const updatedWalletData = processWalletData(user);
        setWalletData(updatedWalletData);

        const payload = {
          userId: data.user._id,
          ethAddress: updatedWalletData?.find(
            (wallet: any) => wallet?.isEVM
          )?.address,
          solanaAddress: updatedWalletData?.find(
            (wallet: any) => !wallet?.isEVM
          )?.address,
        };

        console.log(
          'Updating wallet balances and redirecting to home'
        );
        setIsRedirecting(true);

        try {
          await createLoginWalletBalance(payload);
        } catch (err) {
          console.error('Error updating wallet balances:', err);
          // Continue with redirect even if wallet balance update fails
        }

        clearTimeout(forceCompleteWallets);
        router.push('/');
      } catch (error) {
        console.error('Error verifying user:', error);
        setLoginError(
          'An unexpected error occurred. Please try again.'
        );
        setIsLoading(false);
        setIsRedirecting(false);
        loginInitiated.current = false;
      }
    },
    [
      apiUrl,
      extractEmail,
      router,
      createPrivyWallets,
      processWalletData,
      isLoading,
      isRedirecting,
    ]
  );

  // Privy
  const { state, sendCode, loginWithCode } = useLoginWithEmail();

  useEffect(() => {
    if (authenticated && ready && user) {
      const processedWalletData = processWalletData(user);
      setWalletData(processedWalletData);
    }
  }, [authenticated, ready, user, processWalletData]);

  const isValidEmail = (email: string | null): string => {
    if (!email) {
      return 'Email is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Email is invalid';
    }

    return 'Valid email';
  };

  const handleSendCode = useCallback(
    (e: any) => {
      e.preventDefault();
      const checkEmail = isValidEmail(email);
      if (checkEmail === 'Valid email') {
        setCheckEmailValidation('');
        sendCode({ email });
        setActiveModal('otp');
      } else {
        setCheckEmailValidation(checkEmail);
      }
    },
    [email, sendCode]
  );

  const loginWithCodeCallback = useCallback(
    (code: string) => {
      loginWithCode({ code });
    },
    [loginWithCode]
  );

  // Effect for handling OTP completion
  useEffect(() => {
    const allDigitsFilled = otp.every((digit) => digit !== '');

    if (state.status === 'awaiting-code-input' && allDigitsFilled) {
      // Only call loginWithCode when all fields are filled and not already submitting
      if (!loginInitiated.current) {
        console.log('All OTP fields filled, attempting login');
        loginWithCodeCallback(otp.join(''));
      }
    }

    // Handle successful login - single trigger for verification
    if (
      state.status === 'done' &&
      user &&
      !loginInitiated.current &&
      !isLoading &&
      !isRedirecting
    ) {
      console.log(
        'Login successful, proceeding with user verification'
      );
      // Use setTimeout to avoid React state update conflicts
      setTimeout(() => {
        handleUserVerification(user);
      }, 0);
    }
  }, [
    otp,
    state.status,
    user,
    loginWithCodeCallback,
    handleUserVerification,
    loginInitiated,
    isLoading,
    isRedirecting,
  ]);

  // Reset verification state if login fails
  useEffect(() => {
    if (state.status === 'error') {
      loginInitiated.current = false;
      setIsLoading(false);
      // Reset OTP fields on error
      setOtp(new Array(otpLength).fill(''));
    }
  }, [state.status, otpLength]);

  console.log('user', user);
  console.log('authenticate', authenticated);
  console.log('ready', ready);
  console.log('loginInitiated.curret', loginInitiated.current);
  console.log('state', state);
  console.log('solanaWallets', solanaWallets);

  if (isLoading || isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">
          {isRedirecting
            ? 'Redirecting to your dashboard...'
            : 'Verifying your account...'}
        </p>
      </div>
    );
  }

  if (loginInitiated.current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">
          Processing login...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative w-full max-w-2xl mx-auto p-8 flex justify-center items-center">
        {/* Background Images */}
        <div className="absolute -top-[12%] left-[2%] w-32 h-32 animate-float">
          <Image
            src={astronot}
            alt="astronot"
            className="w-40 h-auto"
            priority
          />
        </div>
        <div className="absolute -bottom-[12%] left-[10%] w-32 h-32">
          <Image
            src={blackPlanet}
            alt="blue planet"
            className="w-60 h-auto"
            priority
          />
        </div>
        {(state.status === 'initial' ||
          state.status === 'sending-code' ||
          activeModal === 'email') && (
          <div className="">
            {/* Card */}
            <Card className="w-full bg-white/15 backdrop-blur-md shadow-xl rounded-3xl max-w-lg mx-auto p-10">
              <div className="flex flex-col items-center space-y-6 text-center pt-24 pb-20">
                {/* SWOP Logo */}
                <Image
                  src={swopLogo}
                  alt="swop logo"
                  className="w-40 h-auto"
                  priority
                />

                {/* Email Input Field */}
                <form
                  onSubmit={handleSendCode}
                  className="flex items-center border border-black rounded-xl overflow-hidden w-[350px]"
                >
                  <div className="p-2 pl-4">
                    <RiMailSendLine
                      className="text-gray-400"
                      size={20}
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-2 py-2 text-gray-600 placeholder-gray-400 outline-none bg-transparent"
                  />
                  <button
                    className="bg-black text-white p-2 rounded-lg m-1 px-4"
                    type="submit"
                    disabled={state.status === 'sending-code'}
                  >
                    <LuArrowRight
                      className="text-gray-50"
                      size={20}
                    />
                  </button>
                </form>

                <div className="h-3">
                  {state.status === 'sending-code' && (
                    <span>Sending Code...</span>
                  )}

                  {checkEmailValidation !== 'Valid email' && (
                    <p className="text-red-400 text-sm">
                      {checkEmailValidation}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {(state.status === 'awaiting-code-input' ||
          state.status === 'submitting-code' ||
          state.status === 'error') &&
          activeModal === 'otp' && (
            <div className="flex flex-col items-center justify-center p-8 bg-white/15 backdrop-blur-md rounded-2xl shadow-lg w-[420px] border z-30">
              {/* Close & Back Buttons */}
              <div className="flex justify-between w-full text-gray-500">
                <button
                  className="text-lg"
                  onClick={() => {
                    setOtp(new Array(otpLength).fill(''));
                    setActiveModal('email');
                  }}
                >
                  <GoArrowLeft className="text-gray-800 " size={25} />
                </button>
                <span className="text-base -ml-5">
                  Log in or sign up
                </span>
                <button className="text-lg"></button>
              </div>
              {/* Mail Icon */}
              <RiMailSendLine
                className="text-indigo-500 mt-6"
                size={40}
              />
              {/* Title */}
              <h2 className="font-semibold text-lg mt-4">
                Enter Configuration Code
              </h2>
              {/* Email Info */}
              <p className="text-sm text-gray-600 text-center mt-3">
                Please check{' '}
                <span className="font-medium">{email}</span> for an
                email from privy.io and enter your code below.
              </p>
              {/* OTP Input Fields */}
              <div className="flex justify-center gap-3 mt-12">
                {otp.map((_, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      if (el) inputRefs.current[index] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={otp[index]}
                    onChange={(e) => handleChange(index, e)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-16 border border-gray-300 rounded-lg text-center text-xl focus:outline-none focus:border-indigo-500"
                  />
                ))}
              </div>
              {/* Resend Code */}
              <p className="text-sm text-gray-500 mt-5">
                Didn&apos;t get an email?{'  '}
                <span
                  className="text-indigo-600 cursor-pointer"
                  onClick={handleSendCode}
                >
                  Resend code
                </span>
              </p>
              {/* Error */}
              <div className="h-3">
                {state.status === 'error' && (
                  <p className="text-red-400 text-sm mt-2">
                    Invalid OTP
                  </p>
                )}
              </div>
            </div>
          )}
      </div>
    );
  }

  if (!ready || isLoggingOut || isRedirecting) {
    return <Loader />;
  }

  // Display error in UI
  if (loginError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white/15 backdrop-blur-md rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-500 mb-4">
            Login Error
          </h2>
          <p className="text-gray-700 mb-6">{loginError}</p>
          <button
            className="bg-black text-white px-6 py-2 rounded-lg"
            onClick={() => {
              setLoginError(null);
              window.location.href = '/login';
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <Loader />;
};

export default Login;
