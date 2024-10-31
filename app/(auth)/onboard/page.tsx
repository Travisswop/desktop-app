'use client';

import React, { useEffect, useState } from 'react';
import Registration from '@/components/onboard/Registration';
import SmartSiteInformation from '@/components/onboard/SmartSiteInformation';
import CreateSwopID from '@/components/onboard/CreateSwopID';
import { useLinkAccount, usePrivy } from '@privy-io/react-auth';
import { OnboardingData, PrivyUser } from '@/lib/types';

const Onboard: React.FC = () => {
  const { authenticated, ready, user } = usePrivy();
  const [step, setStep] = useState(0);
  const [userData, setUserData] = useState({});

  console.log('privy', user);

  const { linkEmail } = useLinkAccount({
    onSuccess: (user, linkMethod, linkedAccount) => {
      console.log(user, linkMethod, linkedAccount);
    },
    onError: (error, details) => {
      console.log(error, details);
    },
  });

  useEffect(() => {
    if (ready && authenticated && !user?.email) {
      linkEmail();
    }
  }, [ready, authenticated, user?.email, linkEmail]);

  const handleNextStep = (data: Partial<OnboardingData>) => {
    setUserData((prevData) => ({ ...prevData, ...data }));
    setStep((prevStep) => prevStep + 1);
  };

  if (!user?.email) {
    return <button onClick={linkEmail}>Link your email</button>;
  }

  const privyUser: PrivyUser = {
    ...user,
    email:
      typeof user.email === 'string'
        ? user.email
        : user.email.address,
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
