"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Loader from "@/components/loading/Loader";
import OnboardingAssistantFlow from "@/components/onboard-ai/OnboardingAssistantFlow";
import { OnboardAiUser } from "@/components/onboard-ai/types";

const extractWalletInfo = (userWallet: any) => {
  if (!userWallet) return undefined;

  return {
    address: userWallet.address || "",
    chainId: String(userWallet.chainId || ""),
    chainType: userWallet.chainType || "",
  };
};

export default function OnboardAiPage() {
  const { user, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      router.push("/login");
    }
  }, [ready, user, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">Initializing...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  const email =
    user?.google?.email ||
    user?.email?.address ||
    user?.linkedAccounts.find((account) => account.type === "email")
      ?.address ||
    user?.linkedAccounts.find((account) => account.type === "google_oauth")
      ?.email;

  const onboardUser: OnboardAiUser = {
    ...user,
    name: user?.google?.name || "",
    email: email || "",
    wallet: extractWalletInfo(user.wallet),
    linkedAccounts: user.linkedAccounts,
  };

  return <OnboardingAssistantFlow user={onboardUser} />;
}
