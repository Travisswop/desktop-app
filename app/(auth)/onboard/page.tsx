'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Registration from '@/components/onboard/Registration';
import SmartSiteInformation from '@/components/onboard/SmartSiteInformation';
import CreateSwopID from '@/components/onboard/CreateSwopID';
import { OnboardingData, PrivyUser, WalletInfo } from '@/lib/types';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Loader from '@/components/loading/Loader';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import { apiFetch } from '@/lib/api/apiFetch';
import { requiresSwopIdCompletion } from '@/lib/onboardingStatus';
import { useUser, type UserData } from '@/lib/UserContext';

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

const toOnboardingUserInfo = (
  user: UserData | any,
): OnboardingData['userInfo'] => ({
  email: user?.email || '',
  mobileNo: user?.mobileNo || '',
  apartment: user?.apartment || user?.apt || '',
  address: user?.address || '',
  bio: user?.bio || '',
  birthdate:
    typeof user?.birthdate === 'number'
      ? user.birthdate
      : typeof user?.dob === 'number'
      ? user.dob
      : undefined,
  avatar: user?.avatar || user?.profilePic || '',
  name: user?.name || '',
  primaryMicrosite: String(
    user?.primaryMicrosite?._id || user?.primaryMicrosite || '',
  ),
});

const OnboardContent: React.FC = () => {
  const { user: privyAuthUser, ready } = usePrivy();
  const { user: backendUser, loading: backendUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [userData, setUserData] = useState<OnboardingData>({});
  const [resumeChecked, setResumeChecked] = useState(false);

  const shouldResumeSwopId = searchParams?.get('step') === 'swop-id';

  const email =
    privyAuthUser?.google?.email ||
    privyAuthUser?.email?.address ||
    privyAuthUser?.linkedAccounts.find((account) => account.type === 'email')
      ?.address ||
    privyAuthUser?.linkedAccounts.find(
      (account) => account.type === 'google_oauth'
    )?.email;

  const handleNextStep = (data: Partial<OnboardingData>) => {
    setUserData((prevData) => ({ ...prevData, ...data }));
    setStep((prevStep) => prevStep + 1);
  };

  // Add effect to handle redirect after Privy is ready
  useEffect(() => {
    if (ready && !privyAuthUser) {
      // Use Next.js router instead of window.location.href to prevent hard reload
      router.push('/login');
    }
  }, [ready, privyAuthUser, router]);

  useEffect(() => {
    if (!shouldResumeSwopId) {
      setResumeChecked(true);
      return;
    }

    if (backendUser) {
      if (requiresSwopIdCompletion(backendUser)) {
        setUserData({ userInfo: toOnboardingUserInfo(backendUser) });
        setStep(2);
        setResumeChecked(true);
        return;
      }

      router.push('/');
      return;
    }

    if (backendUserLoading) return;

    if (!ready || !privyAuthUser) return;

    if (!email) {
      setStep(0);
      setResumeChecked(true);
      return;
    }

    let cancelled = false;

    const loadExistingUser = async () => {
      setResumeChecked(false);

      try {
        const response = await apiFetch(
          buildSwopApiUrl(
            `/api/v2/desktop/user/${encodeURIComponent(email)}`,
          ),
          { headers: { 'Content-Type': 'application/json' } },
        );

        if (!response.ok) {
          if (response.status === 404) {
            if (!cancelled) {
              setStep(0);
              setResumeChecked(true);
            }
            return;
          }

          throw new Error(`Unable to load onboarding state: ${response.status}`);
        }

        const data = await response.json();

        if (cancelled) return;

        if (requiresSwopIdCompletion(data.user)) {
          setUserData({ userInfo: toOnboardingUserInfo(data.user) });
          setStep(2);
          setResumeChecked(true);
          return;
        }

        router.push('/');
      } catch (error) {
        console.error('Failed to resume Swop ID onboarding:', error);
        if (!cancelled) {
          setStep(0);
          setResumeChecked(true);
        }
      }
    };

    loadExistingUser();

    return () => {
      cancelled = true;
    };
  }, [
    backendUser,
    backendUserLoading,
    email,
    ready,
    router,
    shouldResumeSwopId,
    privyAuthUser,
  ]);

  // Show loading while Privy is initializing
  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">Initializing...</p>
      </div>
    );
  }

  if (shouldResumeSwopId && !resumeChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">
          Loading your Swop ID setup...
        </p>
      </div>
    );
  }

  // Show loading while redirecting to login
  if (!privyAuthUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">
          Redirecting to login...
        </p>
      </div>
    );
  }

  const onboardPrivyUser: PrivyUser = {
    ...privyAuthUser,
    name: privyAuthUser?.google?.name || '',
    email: email || '',
    wallet: extractWalletInfo(privyAuthUser.wallet),
  };

  return (
    <OnboardingFlow
      user={onboardPrivyUser}
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

const Onboard: React.FC = () => (
  <Suspense
    fallback={
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">Initializing...</p>
      </div>
    }
  >
    <OnboardContent />
  </Suspense>
);

export default Onboard;
