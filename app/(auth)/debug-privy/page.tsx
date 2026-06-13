'use client';

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
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
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
import logger from '@/utils/logger';

const DebugPrivy: React.FC = () => {
  const { authenticated, ready, user } = usePrivy();
  const { logout } = useLogout();
  const router = useRouter();
  const loginInitiated = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCreatingWallets, setIsCreatingWallets] = useState(false);
  const [wasAuthenticated, setWasAuthenticated] = useState(false);

  const [walletData, setWalletData] = useState<WalletItem[] | null>(
    null
  );
  const [walletsCreated, setWalletsCreated] = useState({
    ethereum: false,
    solana: false,
  });

  const [email, setEmail] = useState('');
  const [activeModal, setActiveModal] = useState('email');
  const [checkEmailValidation, setCheckEmailValidation] =
    useState('');

  const otpLength = 6;
  const [otp, setOtp] = useState(new Array(otpLength).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(
    new Array(otpLength).fill(null)
  );

  // Add state to capture error logs for display
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [walletCreationLogs, setWalletCreationLogs] = useState<
    string[]
  >([]);

  // Helper function to add error logs
  const addErrorLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setErrorLogs((prev) => [...prev, logMessage]);
    console.error(logMessage);
  }, []);

  // Helper function to add wallet creation logs
  const addWalletLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setWalletCreationLogs((prev) => [...prev, logMessage]);
    console.log(logMessage);
  }, []);

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

  const { createWallet } = useCreateWallet({
    onSuccess: ({ wallet }) => {
      addWalletLog(
        `Created wallet successfully: ${JSON.stringify(wallet)}`
      );
    },
    onError: (error) => {
      addErrorLog(
        `Failed to create wallet with error: ${JSON.stringify(error)}`
      );
    },
  });

  // Use the specific hook for Solana wallets
  const { wallets: solanaWallets, createWallet: createSolanaWallet } =
    useSolanaWallets();

  // Function to create both Ethereum and Solana wallets
  const createPrivyWallets = useCallback(async () => {
    setIsCreatingWallets(true);
    try {
      addWalletLog('Starting wallet creation process...');

      // Add authentication checks
      if (!authenticated) {
        addErrorLog(
          'User is not authenticated - cannot create wallets'
        );
        return;
      }

      if (!ready) {
        addErrorLog('Privy is not ready - cannot create wallets');
        return;
      }

      if (!user) {
        addErrorLog(
          'User object is not available - cannot create wallets'
        );
        return;
      }

      addWalletLog(
        `Authentication status: authenticated=${authenticated}, ready=${ready}, user=${!!user}`
      );

      // Add a small delay to ensure authentication is fully propagated
      await new Promise((resolve) => setTimeout(resolve, 500));
      addWalletLog(
        'Authentication delay complete, proceeding with wallet creation...'
      );

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

      addWalletLog(
        `Wallet status check - Ethereum: ${hasEthereumWallet}, Solana: ${hasSolanaWallet}`
      );
      addWalletLog(
        `Wallets created state - Ethereum: ${walletsCreated.ethereum}, Solana: ${walletsCreated.solana}`
      );

      // Create Ethereum wallet if needed
      if (!hasEthereumWallet && !walletsCreated.ethereum) {
        try {
          addWalletLog('Attempting to create Ethereum wallet...');

          // Double-check authentication before wallet creation
          if (!authenticated || !ready || !user) {
            addErrorLog(
              'Authentication state changed during wallet creation - aborting Ethereum wallet creation'
            );
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
              addWalletLog(
                'Ethereum wallet already exists, marking as created'
              );
              return { status: 'already_exists' };
            }
            // Log and rethrow other errors
            addErrorLog(
              `Ethereum wallet creation error: ${JSON.stringify(
                error
              )}`
            );
            throw error;
          });

          addWalletLog(
            `Ethereum wallet creation result: ${JSON.stringify(
              result
            )}`
          );
          setWalletsCreated((prev) => ({ ...prev, ethereum: true }));
          addWalletLog('Ethereum wallet creation complete');
        } catch (err) {
          addErrorLog(
            `Ethereum wallet creation failed: ${JSON.stringify(err)}`
          );
          // Don't mark as created if there was a real error
        }
      } else {
        addWalletLog(
          'Skipping Ethereum wallet creation - already exists or already created'
        );
      }

      // Create Solana wallet if needed
      if (!hasSolanaWallet && !walletsCreated.solana) {
        try {
          addWalletLog('Attempting to create Solana wallet...');

          // Double-check authentication before wallet creation
          if (!authenticated || !ready || !user) {
            addErrorLog(
              'Authentication state changed during wallet creation - aborting Solana wallet creation'
            );
            return;
          }

          const result = await createSolanaWallet().catch((error) => {
            if (
              error === 'embedded_wallet_already_exists' ||
              (error &&
                typeof error === 'object' &&
                'message' in error &&
                error.message === 'embedded_wallet_already_exists')
            ) {
              addWalletLog(
                'Solana wallet already exists, marking as created'
              );
              return { status: 'already_exists' };
            }
            addErrorLog(
              `Solana wallet creation error: ${JSON.stringify(error)}`
            );
            throw error;
          });

          addWalletLog(
            `Solana wallet creation result: ${JSON.stringify(result)}`
          );
          setWalletsCreated((prev) => ({ ...prev, solana: true }));
          addWalletLog('Solana wallet creation complete');
        } catch (err) {
          addErrorLog(
            `Solana wallet creation failed: ${JSON.stringify(err)}`
          );
        }
      } else {
        addWalletLog(
          'Skipping Solana wallet creation - already exists or already created'
        );
      }

      // Final status check
      addWalletLog(
        `Final wallet creation status: ${JSON.stringify(
          walletsCreated
        )}`
      );
    } catch (error) {
      addErrorLog(
        `Error in wallet creation flow: ${JSON.stringify(error)}`
      );
      // Still mark wallets as attempted to prevent infinite loops
      setWalletsCreated({ ethereum: true, solana: true });
    } finally {
      setIsCreatingWallets(false);
    }
  }, [
    authenticated,
    ready,
    user,
    createWallet,
    createSolanaWallet,
    walletsCreated,
    addWalletLog,
    addErrorLog,
  ]);

  // Privy login hooks
  const { state, sendCode, loginWithCode } = useLoginWithEmail();

  useEffect(() => {
    if (authenticated && ready && user) {
      const processedWalletData = processWalletData(user);
      setWalletData(processedWalletData);
      addWalletLog('User authenticated, wallet data processed');
    }
  }, [authenticated, ready, user, processWalletData]);

  // Track when user becomes authenticated
  useEffect(() => {
    if (authenticated && ready && user && state.status === 'done') {
      setWasAuthenticated(true);
    }
  }, [authenticated, ready, user, state.status]);

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

  // Manual OTP handling for debugging
  useEffect(() => {
    const allDigitsFilled = otp.every((digit) => digit !== '');

    if (state.status === 'awaiting-code-input' && allDigitsFilled) {
      // Only call loginWithCode when all fields are filled and not already submitting
      if (!loginInitiated.current) {
        addWalletLog('All OTP fields filled, attempting login');
        loginWithCodeCallback(otp.join(''));
      }
    }

    // Log successful login but don't trigger verification automatically
    if (state.status === 'done' && user) {
      addWalletLog('Login successful! User authenticated');
      addWalletLog('Ready to debug wallet creation issues');
    }
  }, [otp, state.status, user, loginWithCodeCallback, addWalletLog]);

  // Reset verification state if login fails
  useEffect(() => {
    if (state.status === 'error') {
      loginInitiated.current = false;
      setIsLoading(false);
      // Reset OTP fields on error
      setOtp(new Array(otpLength).fill(''));
      addErrorLog('Login failed - OTP error');
    }
  }, [state.status, otpLength, addErrorLog]);

  // Debug logging - only log when values change
  useEffect(() => {
    logger.log('Debug Privy - user', user);
    logger.log('Debug Privy - authenticated', authenticated);
    logger.log('Debug Privy - ready', ready);
    logger.log('Debug Privy - state', state);
    logger.log('Debug Privy - solanaWallets', solanaWallets);
    logger.log('Debug Privy - walletData', walletData);
  }, [user, authenticated, ready, state, solanaWallets, walletData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">Processing...</p>
      </div>
    );
  }

  // Show debug info when authenticated and ready, or when user was previously authenticated but might be null due to error
  if (
    (authenticated && ready && user) ||
    (wasAuthenticated && ready && state.status === 'done')
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-white/15 backdrop-blur-md rounded-xl shadow-lg p-8 max-w-6xl w-full">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Privy Debug Page - Login Successful!
          </h2>

          {/* Add warning if user is null but was previously authenticated */}
          {!user && wasAuthenticated && (
            <div className="mb-6 p-4 bg-orange-100 border border-orange-300 rounded">
              <p className="text-orange-800 text-sm">
                <strong>Warning:</strong> User object became null
                after authentication. This might be due to an error
                during wallet creation. The debug interface remains
                available for troubleshooting.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-semibold mb-2">Login State:</h3>
              <div className="bg-gray-100 p-3 rounded text-sm">
                <p>
                  <strong>Authenticated:</strong>{' '}
                  {authenticated.toString()}
                </p>
                <p>
                  <strong>Ready:</strong> {ready.toString()}
                </p>
                <p>
                  <strong>State Status:</strong> {state.status}
                </p>
                <p>
                  <strong>User Available:</strong>{' '}
                  {(!!user).toString()}
                </p>
                <p>
                  <strong>Was Authenticated:</strong>{' '}
                  {wasAuthenticated.toString()}
                </p>
                <p>
                  <strong>Login Initiated:</strong>{' '}
                  {loginInitiated.current.toString()}
                </p>
                <p>
                  <strong>Is Loading:</strong> {isLoading.toString()}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                Wallets Created Status:
              </h3>
              <div className="bg-gray-100 p-3 rounded text-sm">
                <p>
                  <strong>Ethereum:</strong>{' '}
                  {walletsCreated.ethereum.toString()}
                </p>
                <p>
                  <strong>Solana:</strong>{' '}
                  {walletsCreated.solana.toString()}
                </p>
              </div>
            </div>
          </div>

          {/* Error Logs Section */}
          {errorLogs.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-red-600">
                Error Logs:
              </h3>
              <div className="bg-red-50 border border-red-200 rounded p-3 max-h-40 overflow-y-auto">
                {errorLogs.map((log, index) => (
                  <div
                    key={index}
                    className="text-sm text-red-800 mb-1 font-mono"
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wallet Creation Logs Section */}
          {walletCreationLogs.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-blue-600">
                Wallet Creation Logs:
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 max-h-40 overflow-y-auto">
                {walletCreationLogs.map((log, index) => (
                  <div
                    key={index}
                    className="text-sm text-blue-800 mb-1 font-mono"
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <h3 className="font-semibold">User Info:</h3>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-32">
                {user
                  ? JSON.stringify(user, null, 2)
                  : 'User object is null (this may be due to an error)'}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold">Wallet Data:</h3>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(walletData, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold">Solana Wallets:</h3>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(solanaWallets, null, 2)}
              </pre>
            </div>
          </div>

          <div className="mt-6 flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => {
                console.log('Create Wallets button clicked!');
                addWalletLog(
                  'Manual wallet creation triggered from button'
                );
                console.log('addWalletLog called');
                createPrivyWallets();
                console.log('createPrivyWallets called');
              }}
              disabled={isCreatingWallets}
              className={`px-4 py-2 rounded text-white ${
                isCreatingWallets
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isCreatingWallets
                ? 'Creating Wallets...'
                : 'Create Wallets (Watch Logs Above)'}
            </button>

            <button
              onClick={() => {
                logout();
                setIsLoggingOut(true);
              }}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>

          <div className="mt-4 p-4 bg-yellow-100 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Debug Instructions:</strong> This page is for
              testing Privy wallet creation only. Click &quot;Create
              Wallets&quot; to trigger the wallet creation process.
              All logs and errors will appear in the colored sections
              above. Red sections show errors, blue sections show
              wallet creation progress.
            </p>
          </div>
        </div>
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

        <div className="w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              Privy Debug Page
            </h1>
            <p className="text-gray-300">
              Test Privy wallet creation without backend API calls
            </p>
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
              <div className="flex flex-col items-center justify-center p-8 bg-white/15 backdrop-blur-md rounded-2xl shadow-lg w-[420px] border z-30 mx-auto">
                {/* Close & Back Buttons */}
                <div className="flex justify-between w-full text-gray-500">
                  <button
                    className="text-lg"
                    onClick={() => {
                      setOtp(new Array(otpLength).fill(''));
                      setActiveModal('email');
                    }}
                  >
                    <GoArrowLeft
                      className="text-gray-800 "
                      size={25}
                    />
                  </button>
                  <span className="text-base -ml-5">
                    Privy Debug Login
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
      </div>
    );
  }

  if (!ready || isLoggingOut) {
    return <Loader />;
  }

  return <Loader />;
};

export default DebugPrivy;
