'use client';

import React, { useEffect, useState } from 'react';
import Registration from '@/components/onboard/Registration';
import SmartSiteInformation from '@/components/onboard/SmartSiteInformation';
import CreateSwopID from '@/components/onboard/CreateSwopID';
import { useLinkAccount, usePrivy } from '@privy-io/react-auth';
import { OnboardingData, PrivyUser } from '@/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import astronot from '@/public/onboard/astronot.svg';
import bluePlanet from '@/public/onboard/blue-planet.svg';
import yellowPlanet from '@/public/onboard/yellow-planet.svg';

const Onboard: React.FC = () => {
  const { authenticated, ready, user } = usePrivy();
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

  const { linkEmail } = useLinkAccount({
    onSuccess: (user, linkMethod, linkedAccount) => {
      console.log('on success', user, linkMethod, linkedAccount);
    },
    onError: (error, details) => {
      console.log('on error', error, details);
    },
  });

  // useEffect(() => {
  //   if (ready && authenticated && !email) {
  //     linkEmail();
  //   }
  // }, [ready, authenticated, email, linkEmail]);

  const handleNextStep = (data: Partial<OnboardingData>) => {
    setUserData((prevData) => ({ ...prevData, ...data }));
    setStep((prevStep) => prevStep + 1);
  };

  if (!email) {
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
              onClick={linkEmail}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-sm">✉️</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Connect your email to continue
                </span>
              </div>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const privyUser: PrivyUser = {
    ...user,
    name: user?.google?.name || '',
    email:
      typeof user.email === 'string'
        ? user.email
        : user.email?.address || '',
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
