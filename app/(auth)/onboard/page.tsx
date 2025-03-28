'use client';

import React, { useState } from 'react';
import Registration from '@/components/onboard/Registration';
import SmartSiteInformation from '@/components/onboard/SmartSiteInformation';
import CreateSwopID from '@/components/onboard/CreateSwopID';
import { OnboardingData, PrivyUser } from '@/lib/types';
import { usePrivy } from '@privy-io/react-auth';

const Onboard: React.FC = () => {
  const { user } = usePrivy();
  console.log('🚀 ~ user:', user);
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

  if (typeof window !== 'undefined' && !user) {
    window.location.href = '/login'; // Redirect to login page if user is null
  }

  if (user) {
    const privyUser: PrivyUser = {
      ...user,
      name: user?.google?.name || '',
      email: email || '',
      wallet: user.wallet
        ? {
            address: user.wallet.address,
            chainId: user.wallet.chainId,
            chainType: user.wallet.chainType,
          }
        : undefined,
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
