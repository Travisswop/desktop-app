'use client';

import React, { useState, useEffect } from 'react';
import Registration from '@/components/onboard/Registration';
import SmartSiteInformation from '@/components/onboard/SmartSiteInformation';
import CreateSwopID from '@/components/onboard/CreateSwopID';
import { OnboardingData, PrivyUser, WalletInfo } from '@/lib/types';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Loader from '@/components/loading/Loader';

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
  const { user, ready } = usePrivy();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [userData, setUserData] = useState({});

  const email =
    user?.google?.email ||
    user?.email?.address ||
    user?.linkedAccounts.find((account) => account.type === 'email')
      ?.address ||
    user?.linkedAccounts.find(
      (account) => account.type === 'google_oauth'
    )?.email;

  const handleNextStep = (data: Partial<OnboardingData>) => {
    setUserData((prevData) => ({ ...prevData, ...data }));
    setStep((prevStep) => prevStep + 1);
  };

  // Add effect to handle redirect after Privy is ready
  useEffect(() => {
    if (ready && !user) {
      // Use Next.js router instead of window.location.href to prevent hard reload
      router.push('/login');
    }
  }, [ready, user, router]);

  // Show loading while Privy is initializing
  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">Initializing...</p>
      </div>
    );
  }

  // Show loading while redirecting to login
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">
          Redirecting to login...
        </p>
      </div>
    );
  }

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
