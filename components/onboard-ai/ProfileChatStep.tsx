"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useCreateWallet as useSolanaCreateWallet } from "@privy-io/react-auth/solana";
import { ArrowUp, Check, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/lib/UserContext";
import {
  attachSwopIdToSmartSite,
  createAiOnboardingSocials,
  createAiOnboardingUser,
  hasSmartSiteDetailsToSave,
} from "./onboardingApi";
import {
  EMPTY_PROFILE,
  extractProfileDetails,
  getNextAssistantPrompt,
  hasEnoughToSave,
} from "./profileParser";
import type {
  AiOnboardingProfile,
  DiscoveredSocialCandidate,
  OnboardAiUser,
  OnboardingChatMessage,
  SelectedSwopId,
} from "./types";

interface ProfileChatStepProps {
  selectedSwopId: SelectedSwopId;
  user: OnboardAiUser;
}

const SWOP_ID_GATEWAY = "https://swop-id-ens-gateway.swop.workers.dev";

const makeMessage = (
  sender: OnboardingChatMessage["sender"],
  text: string,
): OnboardingChatMessage => ({
  id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  sender,
  text,
});

const summaryFields: Array<{
  key: keyof AiOnboardingProfile;
  label: string;
}> = [
  { key: "name", label: "Name" },
  { key: "bio", label: "Bio" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "officeAddress", label: "Address" },
];

export default function ProfileChatStep({
  selectedSwopId,
  user,
}: ProfileChatStepProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { createWallet: createSolanaWallet } = useSolanaCreateWallet();
  const { refreshUser } = useUser();

  const [profile, setProfile] = useState<AiOnboardingProfile>({
    ...EMPTY_PROFILE,
    email: user.email || "",
    name: user.name || "",
  });
  const [messages, setMessages] = useState<OnboardingChatMessage[]>([
    makeMessage(
      "assistant",
      `${selectedSwopId.ens} is ready. Tell me your name, short bio, and any links you want on your SmartSite. You can write it naturally.`,
    ),
  ]);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [hasAutoDiscovered, setHasAutoDiscovered] = useState(false);
  const [savedSteps, setSavedSteps] = useState<string[]>([]);
  const [discoveredLinks, setDiscoveredLinks] = useState<
    Array<DiscoveredSocialCandidate & { selected: boolean }>
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const capturedFields = useMemo(
    () =>
      summaryFields.filter(({ key }) => {
        const value = profile[key];
        return typeof value === "string" && value.trim();
      }),
    [profile],
  );

  const hasUnappliedSelectedDiscoveries = discoveredLinks.some(
    (candidate) =>
      candidate.selected && profile[candidate.platform] !== candidate.value,
  );

  const appendMessages = (...items: OnboardingChatMessage[]) => {
    setMessages((current) => [...current, ...items]);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const profileHasDiscoverySeed = (profileToCheck: AiOnboardingProfile) =>
    Boolean(
      profileToCheck.name ||
        profileToCheck.instagram ||
        profileToCheck.twitter ||
        profileToCheck.linkedin ||
        profileToCheck.facebook ||
        profileToCheck.tiktok ||
        profileToCheck.website ||
        profileToCheck.email,
    );

  const shouldAutoDiscoverFromMessage = (
    message: string,
    nextProfile: AiOnboardingProfile,
  ) => {
    if (hasAutoDiscovered || discoveredLinks.length > 0) return false;
    if (!profileHasDiscoverySeed(nextProfile)) return false;

    return /instagram|insta|twitter|\bx\b|linkedin|facebook|tiktok|website|https?:\/\/|www\.|@/i.test(
      message,
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isSaving) return;

    const nextProfile = extractProfileDetails(profile, trimmed);
    setProfile(nextProfile);
    setDraft("");
    appendMessages(
      makeMessage("user", trimmed),
      makeMessage("assistant", getNextAssistantPrompt(nextProfile)),
    );

    if (shouldAutoDiscoverFromMessage(trimmed, nextProfile)) {
      setHasAutoDiscovered(true);
      void discoverSocials(nextProfile, true);
    }
  };

  const hasDiscoverySeed = profileHasDiscoverySeed(profile);

  const discoverSocials = async (
    profileToSearch: AiOnboardingProfile,
    isAutomatic = false,
  ) => {
    if (!profileHasDiscoverySeed(profileToSearch) || isDiscovering) return;

    setIsDiscovering(true);
    appendMessages(
      makeMessage(
        "assistant",
        isAutomatic
          ? "That gives me enough to look for matching socials. I’ll search and bring back suggestions for you to approve."
          : "I’ll search for likely matching socials and bring them back for approval before saving anything.",
      ),
    );

    try {
      const response = await fetch("/api/onboard-ai/discover-socials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileToSearch),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Social discovery failed.");
      }

      const candidates = (result.candidates || []) as DiscoveredSocialCandidate[];
      setDiscoveredLinks(
        candidates.map((candidate) => ({
          ...candidate,
          selected: candidate.confidence >= 65,
        })),
      );

      appendMessages(
        makeMessage(
          "assistant",
          candidates.length
            ? `I found ${candidates.length} possible link${
                candidates.length === 1 ? "" : "s"
              }. Review the suggestions on the right and keep only the ones that are yours.`
            : result.warning ||
                "I could not find confident matches yet. Add a name, company, or another known handle and try again.",
        ),
      );
    } catch (error) {
      console.error("Social discovery failed:", error);
      toast({
        variant: "destructive",
        title: "Search failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not search for social links.",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleDiscoverSocials = () => {
    void discoverSocials(profile);
  };

  const toggleDiscoveredLink = (url: string) => {
    setDiscoveredLinks((links) =>
      links.map((link) =>
        link.url === url ? { ...link, selected: !link.selected } : link,
      ),
    );
  };

  const applySelectedDiscoveries = () => {
    const selected = discoveredLinks.filter((link) => link.selected);
    if (!selected.length) return;

    const nextProfile = { ...profile };
    for (const candidate of selected) {
      nextProfile[candidate.platform] = candidate.value;
    }

    setProfile(nextProfile);
    appendMessages(
      makeMessage(
        "assistant",
        `Added ${selected.length} approved link${
          selected.length === 1 ? "" : "s"
        } to your draft.`,
      ),
    );
  };

  const ensureWallets = async () => {
    const linkedAccounts = privyUser?.linkedAccounts || [];
    const hasEthereumWallet = linkedAccounts.some(
      (account: any) =>
        account.chainType === "ethereum" &&
        (account.walletClientType === "privy" ||
          account.connectorType === "embedded"),
    );
    const hasSolanaWallet = linkedAccounts.some(
      (account: any) =>
        account.chainType === "solana" &&
        (account.walletClientType === "privy" ||
          account.connectorType === "embedded"),
    );

    let createdEthereumWallet: any = null;
    let createdSolanaWallet: any = null;

    if (!hasEthereumWallet) {
      createdEthereumWallet = await createWallet().catch((error: any) => {
        if (error?.message === "embedded_wallet_already_exists") return null;
        throw error;
      });
    }

    if (!hasSolanaWallet) {
      createdSolanaWallet = await createSolanaWallet().catch((error: any) => {
        if (error?.message === "embedded_wallet_already_exists") return null;
        throw error;
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 800));

    const ethereumWallet =
      wallets.find(
        (wallet: any) =>
          wallet.type === "ethereum" && wallet.walletClientType === "privy",
      ) ||
      linkedAccounts.find((account: any) => account.chainType === "ethereum") ||
      createdEthereumWallet?.wallet ||
      createdEthereumWallet;

    const solanaWallet =
      linkedAccounts.find((account: any) => account.chainType === "solana") ||
      createdSolanaWallet?.wallet ||
      createdSolanaWallet;

    return {
      ethereumWallet,
      solanaWallet,
    };
  };

  const createSwopId = async (ethereumWallet: any, micrositeId: string) => {
    if (!ethereumWallet?.getEthereumProvider && !ethereumWallet?.address) {
      throw new Error("No Ethereum wallet available for SwopID creation");
    }

    const provider = ethereumWallet.getEthereumProvider
      ? await ethereumWallet.getEthereumProvider()
      : null;
    if (!provider) {
      throw new Error("No Ethereum provider available for SwopID creation");
    }

    const address = ethereumWallet.address;
    const message = `Set ${selectedSwopId.ens} to ${address}`;
    const signature = await provider.request({
      method: "personal_sign",
      params: [message, address],
    });

    const response = await fetch(`${SWOP_ID_GATEWAY}/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: selectedSwopId.ens,
        owner: address,
        addresses: {
          60: address,
        },
        texts: {
          avatar: "1",
        },
        signature: {
          hash: signature,
          message,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create SwopID: ${errorData}`);
    }

    await attachSwopIdToSmartSite(micrositeId, selectedSwopId.ens);
  };

  const handleSave = async () => {
    if (hasUnappliedSelectedDiscoveries) {
      toast({
        variant: "destructive",
        title: "Apply approved links first",
        description:
          "You have selected suggested links that are not in the profile draft yet.",
      });
      return;
    }

    if (!hasEnoughToSave(profile)) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Add a name in the chat before saving the profile.",
      });
      return;
    }

    setIsSaving(true);
    setSavedSteps([]);

    try {
      const { ethereumWallet, solanaWallet } = await ensureWallets();
      setSavedSteps((steps) => [...steps, "Wallets ready"]);

      const createdUser = await createAiOnboardingUser({
        profile,
        privyId: user.id,
        fallbackEmail: user.email,
        ethereumWallet: ethereumWallet?.address,
        solanaWallet: solanaWallet?.address,
      });
      setSavedSteps((steps) => [...steps, "Profile created"]);
      void refreshUser().catch((error) => {
        console.error("User context refresh failed:", error);
      });

      if (hasSmartSiteDetailsToSave(profile)) {
        await createAiOnboardingSocials(createdUser.primaryMicrosite, profile);
        setSavedSteps((steps) => [...steps, "SmartSite details added"]);
      }

      await createSwopId(ethereumWallet, createdUser.primaryMicrosite);
      setSavedSteps((steps) => [...steps, "SwopID claimed"]);

      toast({
        title: "Profile built",
        description: "Your AI-built SmartSite is ready.",
      });
      router.push("/");
    } catch (error) {
      console.error("AI onboarding save failed:", error);
      const description =
        error instanceof Error
          ? error.message
          : "Please try again in a moment.";
      toast({
        variant: "destructive",
        title: description.includes("different email address")
          ? "Use another email"
          : "Could not finish onboarding",
        description,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-gray-950">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[70vh] flex-col border-x border-gray-200 bg-white">
          <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                Onboarding Assistant
              </p>
              <h1 className="text-xl font-semibold">{selectedSwopId.ens}</h1>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
              <Sparkles className="h-5 w-5" />
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.sender === "assistant"
                      ? "bg-gray-100 text-gray-900"
                      : "bg-black text-white"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-gray-200 bg-white p-4"
          >
            <div className="flex items-end gap-3">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Example: My name is Maya Chen. I run a design studio. Instagram @maya, website https://maya.design..."
                className="min-h-[72px] resize-none rounded-2xl border-gray-200 focus-visible:ring-gray-300"
                disabled={isSaving}
              />
              <Button
                type="submit"
                disabled={!draft.trim() || isSaving}
                className="h-11 w-11 shrink-0 rounded-full bg-black p-0 hover:bg-gray-800"
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </section>

        <aside className="border-r border-gray-200 bg-[#fbfbf8] p-5">
          <div className="sticky top-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Profile Draft</h2>
              <p className="mt-1 text-sm text-gray-500">
                The assistant updates this as you chat.
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              {capturedFields.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No profile details captured yet.
                </p>
              ) : (
                capturedFields.map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    <p className="break-words text-sm text-gray-900">
                      {profile[key]}
                    </p>
                  </div>
                ))
              )}
            </div>

            {savedSteps.length > 0 && (
              <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
                {savedSteps.map((step) => (
                  <div
                    key={step}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                    {step}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <div>
                <h3 className="text-sm font-semibold">Suggested Links</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Search the web from your name or known handle, then approve
                  links before they are applied.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleDiscoverSocials}
                disabled={!hasDiscoverySeed || isDiscovering || isSaving}
                className="h-10 w-full rounded-xl"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Find matching socials
                  </>
                )}
              </Button>

              {discoveredLinks.length > 0 && (
                <div className="space-y-3">
                  {discoveredLinks.map((candidate) => (
                    <label
                      key={`${candidate.platform}-${candidate.url}`}
                      className="block cursor-pointer rounded-lg border border-gray-200 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={candidate.selected}
                          onChange={() => toggleDiscoveredLink(candidate.url)}
                          className="mt-1"
                          disabled={isSaving}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {candidate.label}
                            </p>
                            <span className="text-xs text-gray-500">
                              {candidate.confidence}%
                            </span>
                          </div>
                          <p className="break-words text-xs text-gray-700">
                            {candidate.value}
                          </p>
                          <a
                            href={candidate.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 line-clamp-2 text-xs text-gray-500 hover:text-gray-900"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {candidate.sourceTitle}
                          </a>
                        </div>
                      </div>
                    </label>
                  ))}

                  <Button
                    type="button"
                    onClick={applySelectedDiscoveries}
                    disabled={
                      isSaving || !discoveredLinks.some((link) => link.selected)
                    }
                    className="h-10 w-full rounded-xl bg-gray-900 text-white hover:bg-black"
                  >
                    Apply approved links
                  </Button>
                </div>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={!hasEnoughToSave(profile) || isSaving}
              className="h-12 w-full rounded-xl bg-black text-white hover:bg-gray-800"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Building profile
                </>
              ) : (
                "Build Profile"
              )}
            </Button>
            {hasUnappliedSelectedDiscoveries && (
              <p className="text-xs text-amber-700">
                Apply approved suggestions before building the profile.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
