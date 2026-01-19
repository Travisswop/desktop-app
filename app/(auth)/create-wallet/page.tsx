'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  Mail,
  Shield,
  ArrowLeft,
  Wallet,
  Copy,
} from 'lucide-react';
import swopLogo from '@/public/swopLogo.png';
import {
  useLoginWithEmail,
  usePrivy,
  useCreateWallet,
  useWallets,
  useLogout,
} from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useCreateWallet as useSolanaCreateWallet,
} from '@privy-io/react-auth/solana';

interface WalletCreationStep {
  step: 'input' | 'verify' | 'success';
}

const CreateWalletPage: React.FC = () => {
  const router = useRouter();
  const { authenticated, ready, user } = usePrivy();
  const { wallets: ethWallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { createWallet: createSolanaWallet } = useSolanaCreateWallet();
  const { createWallet: createEthereumWallet } = useCreateWallet();
  const { logout } = useLogout();

  // Privy email login hook
  const { state, sendCode, loginWithCode } = useLoginWithEmail({
    onComplete: (user) => {
      console.log('Login successful:', user);
      handleLoginSuccess(user.user);
    },
    onError: (error) => {
      console.error('Login error:', error);
      toast({
        title: 'Authentication Failed',
        description: 'Failed to authenticate. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const [currentStep, setCurrentStep] =
    useState<WalletCreationStep['step']>('input');
  const [email, setEmail] = useState('');
  const [createdAccount, setCreatedAccount] = useState<{
    email: string;
    userId: string;
    ethWallet?: string;
    solWallet?: string;
  } | null>(null);

  // Track if we need to create wallets after authentication
  const [shouldCreateWallets, setShouldCreateWallets] =
    useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  // OTP state management
  const otpLength = 6;
  const [otp, setOtp] = useState(new Array(otpLength).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(
    new Array(otpLength).fill(null)
  );

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle OTP input changes
  const handleOtpChange = (
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

  // Handle backspace in OTP fields
  const handleOtpKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (
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

  // Handle successful login and prepare for wallet creation
  const handleLoginSuccess = async (privyUser: any) => {
    try {
      console.log('Login successful:', privyUser);
      console.log('User linked accounts:', privyUser.linkedAccounts);

      // Set flag to create wallets once authentication state is updated
      setLoginEmail(email);
      setShouldCreateWallets(true);

      toast({
        title: 'Authentication Successful!',
        description: 'Setting up your wallets...',
      });
    } catch (error) {
      console.error('Error in login process:', error);
      toast({
        title: 'Authentication Failed',
        description: 'Failed to authenticate. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Create wallets after authentication is complete
  const createWalletsAfterAuth = async () => {
    if (!authenticated || !ready || !user) {
      console.log('Not ready for wallet creation yet');
      return;
    }

    // Add a small delay to ensure Privy hooks are fully synchronized
    console.log('Waiting for Privy hooks to synchronize...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      console.log('Creating wallets for authenticated user:', user);
      console.log('User linked accounts:', user.linkedAccounts);
      console.log(
        'Authentication state - authenticated:',
        authenticated,
        'ready:',
        ready
      );

      let ethWallet, solWallet;

      // Check if user already has wallets
      const existingEthWallet = user.linkedAccounts?.find(
        (account: any) =>
          account.type === 'wallet' &&
          account.chainType === 'ethereum' &&
          (account.walletClientType === 'privy' ||
            account.connectorType === 'embedded')
      ) as any;

      const existingSolWallet = user.linkedAccounts?.find(
        (account: any) =>
          account.type === 'wallet' &&
          account.chainType === 'solana' &&
          (account.walletClientType === 'privy' ||
            account.connectorType === 'embedded')
      ) as any;

      console.log('Existing ETH wallet:', existingEthWallet);
      console.log('Existing SOL wallet:', existingSolWallet);

      // Create Ethereum wallet only if it doesn't exist
      if (!existingEthWallet) {
        try {
          console.log('Attempting to create Ethereum wallet...');
          console.log(
            'User authenticated status before ETH creation:',
            { authenticated, ready, userId: user.id }
          );

          ethWallet = await createEthereumWallet();
          console.log(
            'Ethereum wallet created successfully:',
            ethWallet
          );
        } catch (error) {
          console.error('Failed to create Ethereum wallet:', error);

          // If authentication error, try again after a longer delay
          if (
            error instanceof Error &&
            error.message.includes('must be authenticated')
          ) {
            console.log(
              'Authentication error detected, retrying after delay...'
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));

            try {
              console.log(
                'Retry: Attempting to create Ethereum wallet...'
              );
              ethWallet = await createEthereumWallet();
              console.log(
                'Retry successful: Ethereum wallet created:',
                ethWallet
              );
            } catch (retryError) {
              console.error(
                'Retry failed for Ethereum wallet:',
                retryError
              );
              const errorMessage =
                retryError instanceof Error
                  ? retryError.message
                  : String(retryError);
              console.error(
                'Ethereum wallet creation failed with error:',
                errorMessage
              );
            }
          } else {
            // Type-safe error handling for other errors
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            if (
              errorMessage.includes('already has an embedded wallet')
            ) {
              console.log(
                'Using existing Ethereum wallet (error indicated exists)'
              );
            } else {
              console.error(
                'Ethereum wallet creation failed with error:',
                errorMessage
              );
            }
          }
        }
      } else {
        console.log(
          'Using existing Ethereum wallet:',
          existingEthWallet.address
        );
        ethWallet = { address: existingEthWallet.address };
      }

      // Create Solana wallet only if it doesn't exist
      if (!existingSolWallet) {
        try {
          console.log('Attempting to create Solana wallet...');
          console.log(
            'User authenticated status before SOL creation:',
            { authenticated, ready, userId: user.id }
          );

          solWallet = await createSolanaWallet();
          console.log(
            'Solana wallet created successfully:',
            solWallet
          );
        } catch (error) {
          console.error('Failed to create Solana wallet:', error);

          // If authentication error, try again after a longer delay
          if (
            error instanceof Error &&
            error.message.includes('must be authenticated')
          ) {
            console.log(
              'Authentication error detected for Solana, retrying after delay...'
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));

            try {
              console.log(
                'Retry: Attempting to create Solana wallet...'
              );
              solWallet = await createSolanaWallet();
              console.log(
                'Retry successful: Solana wallet created:',
                solWallet
              );
            } catch (retryError) {
              console.error(
                'Retry failed for Solana wallet:',
                retryError
              );
              const errorMessage =
                retryError instanceof Error
                  ? retryError.message
                  : String(retryError);
              console.error(
                'Solana wallet creation failed with error:',
                errorMessage
              );
            }
          } else {
            // Type-safe error handling for other errors
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            if (
              errorMessage.includes('already has an embedded wallet')
            ) {
              console.log(
                'Using existing Solana wallet (error indicated exists)'
              );
            } else {
              console.error(
                'Solana wallet creation failed with error:',
                errorMessage
              );
            }
          }
        }
      } else {
        console.log(
          'Using existing Solana wallet:',
          existingSolWallet.address
        );
        solWallet = { address: existingSolWallet.address };
      }

      console.log('Final wallet addresses:', {
        eth: ethWallet?.address || existingEthWallet?.address,
        sol: solWallet?.address || existingSolWallet?.address,
      });

      // Set created account details
      setCreatedAccount({
        email: loginEmail,
        userId: user.id,
        ethWallet: ethWallet?.address || existingEthWallet?.address,
        solWallet: solWallet?.address || existingSolWallet?.address,
      });

      const hasAnyWallet =
        ethWallet?.address ||
        existingEthWallet?.address ||
        solWallet?.address ||
        existingSolWallet?.address;

      toast({
        title: hasAnyWallet ? 'Account Ready!' : 'Account Created',
        description: hasAnyWallet
          ? existingEthWallet || existingSolWallet
            ? 'Welcome back! Your existing wallets are ready to use.'
            : 'Your Privy account and wallets have been created.'
          : 'Account created but wallet creation may have failed. Check console for details.',
        variant: hasAnyWallet ? 'default' : 'destructive',
      });

      setCurrentStep('success');
      setShouldCreateWallets(false); // Reset flag
    } catch (error) {
      console.error('Error creating wallets:', error);
      toast({
        title: 'Setup Complete with Warnings',
        description:
          'Account is ready, but there may have been issues with wallet setup.',
        variant: 'destructive',
      });
      setCurrentStep('success');
      setShouldCreateWallets(false); // Reset flag
    }
  };

  // Handle email submission to send OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendCode({ email });
      toast({
        title: 'OTP Sent',
        description:
          'Please check your email for the verification code.',
      });
      setCurrentStep('verify');
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: 'Error',
        description: 'Failed to send OTP. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle OTP verification
  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpString = otp.join('');
    if (otpString.length !== otpLength) {
      toast({
        title: 'Invalid OTP',
        description:
          'Please enter the complete 6-digit verification code.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await loginWithCode({ code: otpString });
      // Success is handled by the onComplete callback
    } catch (error) {
      console.error('OTP verification error:', error);
      toast({
        title: 'Verification Failed',
        description: 'Invalid OTP. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle navigation back
  const handleGoBack = () => {
    if (currentStep === 'verify') {
      setCurrentStep('input');
      setOtp(new Array(otpLength).fill(''));
    } else {
      router.back();
    }
  };

  // Handle complete - removed redirect, just show success message
  const handleComplete = () => {
    toast({
      title: 'Welcome!',
      description:
        'Your account and wallets are ready to use. You can now explore the platform.',
    });
  };

  // Copy wallet address function
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} address copied to clipboard.`,
    });
  };

  // Handle logout
  const handleLogout = async () => {
    // Prevent multiple logout attempts
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);

      // Perform logout and navigation in parallel for better performance
      await Promise.all([logout(), router.replace('/create-wallet')]);
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: 'Logout Failed',
        description: 'Failed to logout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Effect to handle OTP auto-submission when all fields are filled
  useEffect(() => {
    const allDigitsFilled = otp.every((digit) => digit !== '');
    if (state.status === 'awaiting-code-input' && allDigitsFilled) {
      loginWithCode({ code: otp.join('') });
    }
  }, [otp, state.status, loginWithCode]);

  // Effect to create wallets after authentication is complete
  useEffect(() => {
    if (shouldCreateWallets && authenticated && ready && user) {
      console.log('User is now authenticated, creating wallets...');
      createWalletsAfterAuth();
    }
  }, [shouldCreateWallets, authenticated, ready, user]);

  // If already authenticated, show existing wallets
  if (authenticated && ready && user) {
    const ethWallet = ethWallets.find(
      (wallet) => wallet.type === 'ethereum'
    );
    const solWallet = solanaWallets.find(
      (wallet) => wallet.type === 'solana'
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Image
                src={swopLogo}
                alt="Swop Logo"
                width={60}
                height={60}
                className="rounded-lg"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-white">
                Your Wallets
              </CardTitle>
              <CardDescription className="text-slate-300">
                Your existing Privy wallet addresses
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Wallet className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                <div className="text-sm text-slate-400">Email:</div>
                <div className="text-sm font-mono text-white">
                  {user.email?.address || 'Not available'}
                </div>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                <div className="text-sm text-slate-400">User ID:</div>
                <div className="text-sm font-mono text-white">
                  {user.id}
                </div>
              </div>

              {ethWallet && (
                <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      Ethereum Wallet:
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(ethWallet.address, 'Ethereum')
                      }
                      className="text-slate-400 hover:text-white p-1 h-auto"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-sm font-mono text-white break-all bg-slate-800/50 p-2 rounded">
                    {ethWallet.address}
                  </div>
                </div>
              )}

              {solWallet && (
                <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      Solana Wallet:
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(solWallet.address, 'Solana')
                      }
                      className="text-slate-400 hover:text-white p-1 h-auto"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-sm font-mono text-white break-all bg-slate-800/50 p-2 rounded">
                    {solWallet.address}
                  </div>
                </div>
              )}

              {!ethWallet && !solWallet && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm text-center">
                    No wallets found. You can create new wallets from
                    your dashboard.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Go to Dashboard
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Button>

              {(ethWallet || solWallet) && (
                <Button
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => {
                    const walletText = [
                      ethWallet && `ETH: ${ethWallet.address}`,
                      solWallet && `SOL: ${solWallet.address}`,
                    ]
                      .filter(Boolean)
                      .join('\n');

                    navigator.clipboard.writeText(walletText);
                    toast({
                      title: 'Copied to Clipboard',
                      description:
                        'All wallet addresses have been copied to your clipboard.',
                    });
                  }}
                >
                  Copy All Addresses
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state during various operations
  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            <p className="text-white text-center">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src={swopLogo}
              alt="Swop Logo"
              width={60}
              height={60}
              className="rounded-lg"
            />
          </div>

          {currentStep !== 'success' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-white">
              {currentStep === 'input' && 'Create Privy Account'}
              {currentStep === 'verify' && 'Verify Your Email'}
              {currentStep === 'success' && 'Account Created!'}
            </CardTitle>
            <CardDescription className="text-slate-300">
              {currentStep === 'input' &&
                'Enter your email address to create your account'}
              {currentStep === 'verify' &&
                'Enter the 6-digit code sent to your email'}
              {currentStep === 'success' &&
                'Your Privy account and wallets are ready to use'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Email Input */}
          {currentStep === 'input' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-200"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                    required
                  />
                </div>
                <p className="text-xs text-slate-400">
                  We&apos;ll send you a verification code to create
                  your account
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!email.trim()}
              >
                Send Verification Code
              </Button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {currentStep === 'verify' && (
            <form
              onSubmit={handleOtpVerification}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-1 p-4 bg-slate-700/30 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-400 mr-2" />
                  <span className="text-sm text-slate-300">
                    Code sent to {email}
                  </span>
                </div>

                <div className="flex justify-center gap-2">
                  {otp.map((_, index) => (
                    <Input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      maxLength={1}
                      value={otp[index]}
                      onChange={(e) => handleOtpChange(index, e)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-12 h-12 text-center text-lg font-semibold bg-slate-700/50 border-slate-600 text-white focus:border-blue-500"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={otp.join('').length !== otpLength}
                >
                  Verify & Create Account
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white"
                  onClick={() => {
                    sendCode({ email });
                    toast({
                      title: 'OTP Resent',
                      description:
                        'A new verification code has been sent to your email.',
                    });
                  }}
                >
                  Resend Code
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Success */}
          {currentStep === 'success' && createdAccount && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">
                  Account Successfully Created!
                </h3>

                <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                  <div className="text-sm text-slate-400">Email:</div>
                  <div className="text-sm font-mono text-white">
                    {createdAccount.email}
                  </div>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                  <div className="text-sm text-slate-400">
                    User ID:
                  </div>
                  <div className="text-sm font-mono text-white">
                    {createdAccount.userId}
                  </div>
                </div>

                {createdAccount.ethWallet && (
                  <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                    <div className="text-sm text-slate-400">
                      Ethereum Wallet:
                    </div>
                    <div className="text-sm font-mono text-white break-all bg-slate-800/50 p-2 rounded">
                      {createdAccount.ethWallet}
                    </div>
                  </div>
                )}

                {createdAccount.solWallet && (
                  <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                    <div className="text-sm text-slate-400">
                      Solana Wallet:
                    </div>
                    <div className="text-sm font-mono text-white break-all bg-slate-800/50 p-2 rounded">
                      {createdAccount.solWallet}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleComplete}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Explore Platform
                </Button>

                {(createdAccount.ethWallet ||
                  createdAccount.solWallet) && (
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => {
                      const walletText = [
                        createdAccount.ethWallet &&
                          `ETH: ${createdAccount.ethWallet}`,
                        createdAccount.solWallet &&
                          `SOL: ${createdAccount.solWallet}`,
                      ]
                        .filter(Boolean)
                        .join('\n');

                      navigator.clipboard.writeText(walletText);
                      toast({
                        title: 'Copied to Clipboard',
                        description:
                          'Wallet addresses have been copied to your clipboard.',
                      });
                    }}
                  >
                    Copy Wallet Addresses
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => {
                    setCurrentStep('input');
                    setEmail('');
                    setOtp(new Array(otpLength).fill(''));
                    setCreatedAccount(null);
                    toast({
                      title: 'Reset Complete',
                      description:
                        'You can now create another account.',
                    });
                  }}
                >
                  Create Another Account
                </Button>
              </div>
            </div>
          )}

          {/* Error state */}
          {state.status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm text-center">
                An error occurred. Please try again.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateWalletPage;
