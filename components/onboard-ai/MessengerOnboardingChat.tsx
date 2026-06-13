"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useCreateWallet as useSolanaCreateWallet } from "@privy-io/react-auth/solana";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/lib/UserContext";
import {
  attachAiOnboardingSmartSiteLinks,
  attachSwopIdToSmartSite,
  createAiOnboardingSocials,
  createAiOnboardingUser,
} from "./onboardingApi";
import {
  AGENT_TERMINAL_BUBBLE_CLASS,
  DmAgentTile,
  TypingDots,
  UserBubble,
} from "./chatStyles";
import ProfileCard, { ProfileCardValues } from "./cards/ProfileCard";
import SocialLinksCard, { SocialLinksValues } from "./cards/SocialLinksCard";
import FundingCard from "./cards/FundingCard";
import type {
  AiOnboardingProfile,
  OnboardAiUser,
  OnboardingChatMessage,
  SelectedSwopId,
} from "./types";

const SWOP_ID_GATEWAY = "https://swop-id-ens-gateway.swop.workers.dev";

const EMPTY_PROFILE: AiOnboardingProfile = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  textMessage: "",
  videoCall: "",
  officeAddress: "",
  facebook: "",
  instagram: "",
  twitter: "",
  linkedin: "",
  tiktok: "",
  website: "",
  bio: "",
};

type Phase =
  | "profile"
  | "savingProfile"
  | "socials"
  | "savingSocials"
  | "funding"
  | "done";

interface MessengerOnboardingChatProps {
  selectedSwopId: SelectedSwopId;
  user: OnboardAiUser;
}

let messageSeq = 0;
const makeMessage = (
  sender: OnboardingChatMessage["sender"],
  text: string,
): OnboardingChatMessage => ({
  id: `${sender}-${(messageSeq += 1)}`,
  sender,
  text,
});

/**
 * Reveals chat messages one at a time. Before each Astro line it shows an
 * "Astro is typing…" indicator for a short, length-scaled beat, then the full
 * message pops in. User lines appear instantly. Real-chat feel, no slow crawl.
 */
function useTypedReveal(messages: OnboardingChatMessage[]) {
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [revealed, setRevealed] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const list = messagesRef.current;
    if (revealed >= list.length) {
      setTyping(false);
      return;
    }

    const msg = list[revealed];
    if (msg.sender === "user") {
      setRevealed((r) => r + 1);
      return;
    }

    let cancelled = false;
    setTyping(true);
    const delay = Math.min(1300, 350 + msg.text.length * 9);
    const timer = setTimeout(() => {
      if (cancelled) return;
      setTyping(false);
      setRevealed((r) => r + 1);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [revealed, messages.length]);

  return {
    revealed,
    typing,
    allRevealed: revealed >= messages.length,
  };
}

export default function MessengerOnboardingChat({
  selectedSwopId,
  user,
}: MessengerOnboardingChatProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { refreshUser } = useUser();
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { createWallet: createSolanaWallet } = useSolanaCreateWallet();

  const [profile, setProfile] = useState<AiOnboardingProfile>({
    ...EMPTY_PROFILE,
    email: user.email || "",
    name: user.name || "",
  });
  const [phase, setPhase] = useState<Phase>("profile");
  const [micrositeId, setMicrositeId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState("1");
  const [birthday, setBirthday] = useState("");
  const ethereumWalletRef = useRef<any>(null);

  const [messages, setMessages] = useState<OnboardingChatMessage[]>([
    makeMessage("assistant", "Welcome to Swop. I'm Astro."),
    makeMessage(
      "assistant",
      `${selectedSwopId.ens} is yours. Let's set up your SmartSite — fill in a couple of quick cards and you're live.`,
    ),
  ]);

  const { revealed, typing, allRevealed } = useTypedReveal(messages);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [revealed, typing, phase]);

  const appendMessages = (...items: OnboardingChatMessage[]) =>
    setMessages((current) => [...current, ...items]);

  // --- Wallet helpers (lifted from the previous ProfileChatStep) ---
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

    return { ethereumWallet, solanaWallet };
  };

  const claimSwopId = async (ethereumWallet: any, micrositeIdToUse: string) => {
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
        addresses: { 60: address },
        texts: { avatar: "1" },
        signature: { hash: signature, message },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create SwopID: ${errorData}`);
    }

    await attachSwopIdToSmartSite(micrositeIdToUse, selectedSwopId.ens);
  };

  // --- Step handlers ---
  const handleProfileSubmit = async (values: ProfileCardValues) => {
    const { profilePic, dob, ...profileFields } = values;
    const nextProfile: AiOnboardingProfile = { ...profile, ...profileFields };
    setProfile(nextProfile);
    setAvatar(profilePic);
    setBirthday(dob);
    appendMessages(makeMessage("user", "Saved my profile details."));
    setPhase("savingProfile");

    try {
      const { ethereumWallet, solanaWallet } = await ensureWallets();
      ethereumWalletRef.current = ethereumWallet;

      const createdUser = await createAiOnboardingUser({
        profile: nextProfile,
        privyId: user.id,
        fallbackEmail: user.email,
        ethereumWallet: ethereumWallet?.address,
        solanaWallet: solanaWallet?.address,
        profilePic,
        dob,
      });

      setMicrositeId(createdUser.primaryMicrosite);

      // The account now exists in the backend — refresh UserContext so it
      // picks up the user + access token (the funding card needs the token).
      void refreshUser().catch((error) => {
        console.error("User context refresh failed:", error);
      });

      if (createdUser.primaryMicrosite && createdUser.token) {
        void attachAiOnboardingSmartSiteLinks({
          profile: nextProfile,
          micrositeId: createdUser.primaryMicrosite,
          accessToken: createdUser.token,
        })
          .then((result) => {
            const count = result?.data?.smartSiteLinks?.length || 0;
            if (!count) return;

            appendMessages(
              makeMessage(
                "assistant",
                `I also found ${count} public link${
                  count === 1 ? "" : "s"
                } for your SmartSite.`,
              ),
            );
          })
          .catch((error) => {
            console.warn("Onboarding social lookup skipped:", error);
          });
      }

      appendMessages(
        makeMessage(
          "assistant",
          "Your SmartSite is live. Now drop in the links you want on it.",
        ),
      );
      setPhase("socials");
    } catch (error) {
      console.error("Onboarding profile save failed:", error);
      toast({
        variant: "destructive",
        title: "Could not save your profile",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      setPhase("profile");
    }
  };

  const handleSocialsSubmit = async (values: SocialLinksValues) => {
    const nextProfile: AiOnboardingProfile = { ...profile, ...values };
    setProfile(nextProfile);
    const anyLinks = Object.values(values).some((v) => v?.trim());
    appendMessages(
      makeMessage("user", anyLinks ? "Added my links." : "Skipped links for now."),
    );
    setPhase("savingSocials");

    try {
      if (micrositeId) {
        await createAiOnboardingSocials(micrositeId, nextProfile);
      }

      // Claim the SwopID chosen earlier (needs the microsite to exist first).
      // A rejected signature shouldn't trap the user — warn and continue.
      if (micrositeId) {
        try {
          await claimSwopId(ethereumWalletRef.current, micrositeId);
          // Pick up the claimed ENS so the post-onboarding redirect guard
          // (requiresSwopIdCompletion) sees a completed account on /wallet.
          void refreshUser().catch((error) => {
            console.error("User context refresh failed:", error);
          });
          appendMessages(
            makeMessage(
              "assistant",
              `Done — ${selectedSwopId.ens} is claimed and your SmartSite is ready.`,
            ),
          );
        } catch (claimError) {
          console.error("SwopID claim failed:", claimError);
          toast({
            variant: "destructive",
            title: "SwopID not claimed yet",
            description:
              "Your SmartSite is saved. You can claim your SwopID later from settings.",
          });
          appendMessages(
            makeMessage(
              "assistant",
              "Your SmartSite is saved. We can finish claiming your SwopID later.",
            ),
          );
        }
      }

      appendMessages(
        makeMessage(
          "assistant",
          "Want to add some USDC to your wallet so you're ready to go?",
        ),
      );
      setPhase("funding");
    } catch (error) {
      console.error("Onboarding socials save failed:", error);
      toast({
        variant: "destructive",
        title: "Could not save your links",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      setPhase("socials");
    }
  };

  const finish = () => {
    setPhase("done");
    router.refresh();
    router.push("/wallet");
  };

  const profileDone = phase !== "profile" && phase !== "savingProfile";
  const socialsActive = phase === "socials" || phase === "savingSocials";
  const socialsDone = phase === "funding" || phase === "done";

  // Editable cards wait until the intro/preceding messages finish typing;
  // completed (read-only) cards stay visible.
  const showProfileCard = profileDone || allRevealed;
  const showSocialsCard =
    (socialsActive && allRevealed) || socialsDone;
  const showFundingCard =
    (phase === "funding" && allRevealed) || phase === "done";

  const currentMessage = messages[revealed];

  const steps = [
    { label: "Profile", done: profileDone, active: !profileDone },
    {
      label: "Links",
      done: socialsDone,
      active: socialsActive,
    },
    {
      label: "Funding",
      done: phase === "done",
      active: phase === "funding",
    },
  ];

  return (
    <div className="swop-dm-shell h-dvh min-h-0 w-full overflow-hidden bg-black p-0 sm:p-3">
      <div className="dm-window flex h-full min-h-0 w-full flex-col overflow-hidden rounded-none border border-white/[0.06] bg-[#0b0c10] sm:rounded-[16px]">
        {/* Top bar */}
        <div className="relative flex h-[42px] flex-shrink-0 items-center gap-2 border-b border-white/[0.07] bg-[#0b0c0f] px-3">
          <span className="dm-mono text-[11px] font-semibold text-[#5a5e69]">
            $_
          </span>
          <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center gap-2">
            <span className="dm-mono text-xs font-semibold text-[#9396a0]">
              Swop
            </span>
            <span className="text-[#5a5e69]">.</span>
            <span className="text-[12.5px] font-medium text-[#9396a0]">
              Messages
            </span>
          </div>
          <div className="ml-auto inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc97] shadow-[0_0_0_3px_rgba(61,220,151,0.13)]" />
            <span className="dm-mono text-[10.5px] font-semibold text-[#5a5e69]">
              Swop Mainnet
            </span>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          {/* Left sidebar — conversation list */}
          <aside className="hidden w-[260px] flex-shrink-0 flex-col border-r border-white/[0.07] bg-[#0b0c0f] lg:flex">
            <div className="border-b border-white/[0.07] px-4 py-3">
              <p className="dm-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
                Messages
              </p>
            </div>
            <div className="p-2">
              <div className="flex items-center gap-2 rounded-[10px] border border-[#3fe08f]/25 bg-[#11141a] px-2.5 py-2">
                <DmAgentTile />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#eceef2]">
                    Astro
                  </p>
                  <p className="dm-mono truncate text-[11px] text-[#5a5e69]">
                    Onboarding · {selectedSwopId.ens}
                  </p>
                </div>
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#3ddc97]" />
              </div>
            </div>
          </aside>

          {/* Center — chat */}
          <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            {/* subtle terminal grid backdrop */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.5]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 0%, rgba(63,224,143,0.06), transparent 55%), repeating-linear-gradient(0deg, rgba(63,224,143,0.025) 0px, rgba(63,224,143,0.025) 1px, transparent 1px, transparent 28px)",
              }}
            />
            <div className="relative flex items-center gap-3 border-b border-white/[0.07] px-5 py-3">
              <DmAgentTile size="h-[40px] w-[40px]" textClassName="text-[14px]" />
              <div>
                <p className="text-[14px] font-semibold text-[#eceef2]">Astro</p>
                <p className="dm-mono text-[11px] text-[#3ddc97]">online</p>
              </div>
            </div>

            <div className="relative flex-1 space-y-4 overflow-y-auto px-5 py-6">
              {messages.slice(0, revealed).map((message) =>
                message.sender === "assistant" ? (
                  <div key={message.id} className="flex items-end gap-2">
                    <DmAgentTile />
                    <div
                      className={`${AGENT_TERMINAL_BUBBLE_CLASS} rounded-tl-md max-w-[82%]`}
                    >
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <UserBubble key={message.id}>{message.text}</UserBubble>
                ),
              )}

              {/* "Astro is typing…" before the next assistant message */}
              {typing && currentMessage?.sender === "assistant" && <TypingDots />}

              {/* Active card */}
              {showProfileCard && (
                <div className="flex">
                  <ProfileCard
                    initial={{
                      name: profile.name,
                      bio: profile.bio,
                      phone: profile.phone,
                      email: profile.email,
                      officeAddress: profile.officeAddress,
                      dob: birthday,
                      profilePic: avatar,
                    }}
                    done={profileDone}
                    isSaving={phase === "savingProfile"}
                    onSubmit={handleProfileSubmit}
                  />
                </div>
              )}

              {showSocialsCard && (
                <div className="flex">
                  <SocialLinksCard
                    initial={{
                      website: profile.website,
                      instagram: profile.instagram,
                      twitter: profile.twitter,
                      linkedin: profile.linkedin,
                      tiktok: profile.tiktok,
                      facebook: profile.facebook,
                      whatsapp: profile.whatsapp,
                    }}
                    done={socialsDone}
                    isSaving={phase === "savingSocials"}
                    onSubmit={handleSocialsSubmit}
                  />
                </div>
              )}

              {showFundingCard && (
                <div className="flex">
                  <FundingCard
                    done={phase === "done"}
                    onSkip={finish}
                    onDone={finish}
                  />
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            {/* Disabled composer — Astro drives the flow via cards */}
            <div className="relative border-t border-white/[0.07] px-5 py-3">
              <div className="dm-mono flex items-center rounded-[12px] border border-white/[0.07] bg-[#101217] px-4 py-2.5 text-[12.5px] text-[#5a5e69]">
                Astro is guiding your setup…
              </div>
            </div>
          </section>

          {/* Right sidebar — setup progress */}
          <aside className="hidden w-[240px] flex-shrink-0 flex-col border-l border-white/[0.07] bg-[#0b0c0f] p-4 xl:flex">
            <p className="dm-mono mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
              Setup
            </p>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-center gap-3">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] font-bold ${
                      step.done
                        ? "border-[#3fe08f] bg-[#3fe08f] text-[#031008]"
                        : step.active
                        ? "border-[#3fe08f] text-[#3fe08f]"
                        : "border-white/[0.12] text-[#5a5e69]"
                    }`}
                  >
                    {step.done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={`text-[13px] font-semibold ${
                      step.done || step.active
                        ? "text-[#eceef2]"
                        : "text-[#5a5e69]"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.active && (
                    <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-[#3fe08f]" />
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
