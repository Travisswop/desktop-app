"use client";

import { useState } from "react";
import ProfileChatStep from "./ProfileChatStep";
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

  return <ProfileChatStep selectedSwopId={selectedSwopId} user={user} />;
}
