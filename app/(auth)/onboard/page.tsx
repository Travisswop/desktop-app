'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Registration from '@/components/onboard/Registration';
import SmartSiteInformation from '@/components/onboard/SmartSiteInformation';
import CreateSwopID from '@/components/onboard/CreateSwopID';
import { OnboardingData, PrivyUser, WalletInfo } from '@/lib/types';
import { usePrivy, useCreateWallet } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import Loader from '@/components/loading/Loader';
import logger from '@/utils/logger';

// Helper function to safely extract wallet data
const extractWalletInfo = (
  userWallet: any
): WalletInfo | undefined => {
  if (!userWallet) return undefined;

  return {
    address: userWallet.address || '',
    chainId: String(userWallet.chainId || ''),
    chainType: userWallet.chainType || '',
  };
};

const Onboard: React.FC = () => {
  const { user, authenticated, ready } = usePrivy();
  const [step, setStep] = useState(0);
  const [userData, setUserData] = useState({});
  const [isCreatingWallets, setIsCreatingWallets] = useState(false);
  const [walletsCreated, setWalletsCreated] = useState({
    ethereum: false,
    solana: false,
  });

  const { createWallet: createEthereumWallet } = useCreateWallet({
    onSuccess: ({ wallet }) => {
      logger.log(
        'Ethereum wallet created successfully:',
        JSON.stringify(wallet)
      );
    },
    onError: (error) => {
      logger.error(
        'Failed to create Ethereum wallet with error:',
        JSON.stringify(error)
      );
    },
  });

  const { createWallet: createSolanaWallet } = useSolanaWallets();

  const email =
    user?.google?.email ||
    user?.email?.address ||
    user?.linkedAccounts.find((account) => account.type === 'email')
      ?.address ||
    user?.linkedAccounts.find(
      (account) => account.type === 'google_oauth'
    )?.email;

  // Function to create both Ethereum and Solana wallets
  const createPrivyWallets = useCallback(async () => {
    if (isCreatingWallets) return; // Prevent multiple simultaneous calls

    setIsCreatingWallets(true);
    try {
      logger.log(
        'Starting wallet creation process for onboarding...'
      );

      // Add authentication checks
      if (!authenticated) {
        logger.error(
          'User is not authenticated - cannot create wallets'
        );
        return;
      }

      if (!ready) {
        logger.error('Privy is not ready - cannot create wallets');
        return;
      }

      if (!user) {
        logger.error(
          'User object is not available - cannot create wallets'
        );
        return;
      }

      logger.log(
        `Authentication status: authenticated=${authenticated}, ready=${ready}, user=${!!user}`
      );

      // Add a small delay to ensure authentication is fully propagated
      await new Promise((resolve) => setTimeout(resolve, 500));
      logger.log(
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

      logger.log('Wallet status:', {
        hasEthereumWallet,
        hasSolanaWallet,
        walletsCreated,
        userLinkedAccounts: user?.linkedAccounts?.length || 0,
        userLinkedAccountsDetails:
          user?.linkedAccounts?.map((acc: any) => ({
            type: acc.type,
            chainType: acc.chainType,
            walletClientType: acc.walletClientType,
            connectorType: acc.connectorType,
          })) || [],
      });

      // Create Ethereum wallet if needed
      if (!hasEthereumWallet && !walletsCreated.ethereum) {
        try {
          logger.log('Creating Ethereum wallet...');

          // Double-check authentication before wallet creation
          if (!authenticated || !ready || !user) {
            logger.error(
              'Authentication state changed during wallet creation - aborting Ethereum wallet creation'
            );
            return;
          }

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
                logger.log(
                  'Ethereum wallet already exists, marking as created'
                );
                return { status: 'already_exists' };
              }
              // Log and rethrow other errors
              logger.error(
                `Ethereum wallet creation error: ${JSON.stringify(
                  error
                )}`
              );
              throw error;
            }
          );

          logger.log('Ethereum wallet creation result:', result);
          setWalletsCreated((prev) => ({ ...prev, ethereum: true }));
          logger.log('Ethereum wallet creation complete');
        } catch (err) {
          logger.error('Ethereum wallet creation error:', err);
          // Don't mark as created if there was a real error
        }
      } else {
        logger.log(
          'Skipping Ethereum wallet creation - already exists or already created'
        );
      }

      // Create Solana wallet if needed
      if (!hasSolanaWallet && !walletsCreated.solana) {
        try {
          logger.log('Creating Solana wallet...');

          // Double-check authentication before wallet creation
          if (!authenticated || !ready || !user) {
            logger.error(
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
              logger.log(
                'Solana wallet already exists, marking as created'
              );
              return { status: 'already_exists' };
            }
            logger.error(
              `Solana wallet creation error: ${JSON.stringify(error)}`
            );
            throw error;
          });

          logger.log(
            `Solana wallet creation result: ${JSON.stringify(result)}`
          );
          setWalletsCreated((prev) => ({ ...prev, solana: true }));
          logger.log('Solana wallet creation complete');
        } catch (err) {
          logger.error('Solana wallet creation error:', err);
        }
      } else {
        logger.log(
          'Skipping Solana wallet creation - already exists or already created'
        );
      }

      // Final status check
      logger.log('Final wallet creation status:', {
        walletsCreated,
        userLinkedAccountsAfter: user?.linkedAccounts?.length || 0,
        finalEthereumWallet:
          (
            user?.linkedAccounts?.find(
              (acc: any) =>
                acc.chainType === 'ethereum' &&
                (acc.walletClientType === 'privy' ||
                  acc.connectorType === 'embedded')
            ) as any
          )?.address || 'none',
        finalSolanaWallet:
          (
            user?.linkedAccounts?.find(
              (acc: any) =>
                acc.chainType === 'solana' &&
                (acc.walletClientType === 'privy' ||
                  acc.connectorType === 'embedded')
            ) as any
          )?.address || 'none',
      });
    } catch (error) {
      logger.error('Error in wallet creation flow:', error);
      // Still mark wallets as attempted to prevent infinite loops
      setWalletsCreated({ ethereum: true, solana: true });
    } finally {
      setIsCreatingWallets(false);
    }
  }, [
    authenticated,
    ready,
    user,
    createEthereumWallet,
    createSolanaWallet,
    walletsCreated,
    isCreatingWallets,
  ]);

  // Check if user needs wallets and create them
  useEffect(() => {
    if (authenticated && ready && user && !isCreatingWallets) {
      // Check if user has any wallets
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

      // If user doesn't have any wallets, create them
      if (
        (!hasEthereumWallet && !walletsCreated.ethereum) ||
        (!hasSolanaWallet && !walletsCreated.solana)
      ) {
        logger.log(
          'User missing wallets, initiating wallet creation...'
        );
        createPrivyWallets();
      } else {
        logger.log('User already has all required wallets');
      }
    }
  }, [
    authenticated,
    ready,
    user,
    createPrivyWallets,
    isCreatingWallets,
    walletsCreated,
  ]);

  const handleNextStep = (data: Partial<OnboardingData>) => {
    setUserData((prevData) => ({ ...prevData, ...data }));
    setStep((prevStep) => prevStep + 1);
  };

  // Show loading while creating wallets
  if (isCreatingWallets) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">
          Setting up your wallets...
        </p>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'; // Redirect to login page if user is null
    }
    return null;
  }

  if (user) {
    const privyUser: PrivyUser = {
      ...user,
      name: user?.google?.name || '',
      email: email || '',
      wallet: extractWalletInfo(user.wallet),
    };

    return (
      <OnboardingFlow
        user={privyUser}
        step={step}
        onNextStep={handleNextStep}
        userData={userData}
      />
    );
  }
};

const OnboardingFlow: React.FC<{
  user: PrivyUser;
  step: number;
  onNextStep: (data: Partial<OnboardingData>) => void;
  userData: OnboardingData;
}> = ({ user, step, onNextStep, userData }) => {
  switch (step) {
    case 0:
      return <Registration user={user} onComplete={onNextStep} />;
    case 1:
      return (
        <SmartSiteInformation
          onComplete={onNextStep}
          userData={userData}
        />
      );
    case 2:
      return <CreateSwopID userData={userData} />;
    default:
      return <div>Onboarding Complete!</div>;
  }
};

export default Onboard;
