"use client";

import { useState } from "react";
import MessengerOnboardingChat from "./MessengerOnboardingChat";
import UsernameStep from "./UsernameStep";
import { OnboardAiUser, SelectedSwopId } from "./types";

interface OnboardingAssistantFlowProps {
  user: OnboardAiUser;
}
export default function OnboardingAssistantFlow({
  user,
}: OnboardingAssistantFlowProps) {
  const [selectedSwopId, setSelectedSwopId] =
    useState<SelectedSwopId | null>(null);

  if (!selectedSwopId) {
    return <UsernameStep onComplete={setSelectedSwopId} />;
  }

  return (
    <MessengerOnboardingChat selectedSwopId={selectedSwopId} user={user} />
  );
}
