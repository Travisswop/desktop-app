import type { AiOnboardingProfile } from "./types";
import { socialGroup, socialMediaBaseUrls } from "@/types/smartsite";
import { apiFetch } from "@/lib/api/apiFetch";
import { buildSwopApiUrl } from "@/lib/api/apiBaseUrl";
import Cookies from "js-cookie";
import type {
  InfoBarData,
  SocialLargeData,
  SocialLargeInfo,
  SocialTopData,
  SocialTopInfo,
} from "@/types/smartsite";

export interface CreateAiProfilePayload {
  profile: AiOnboardingProfile;
  privyId?: string;
  fallbackEmail?: string;
  ethereumWallet?: string;
  solanaWallet?: string;
  /** Cloudinary URL or an avatar id like "1". Defaults to the empty avatar. */
  profilePic?: string;
  /** Birthday as an epoch-ms timestamp string. */
  dob?: string;
}

function getAuthCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure:
      typeof window !== "undefined" &&
      window.location.protocol === "https:",
  };
}

function persistCreatedUserAuth(userId?: string, token?: string) {
  if (!userId) return;

  Cookies.set("user-id", userId, getAuthCookieOptions());
  if (token) {
    Cookies.set("access-token", token, getAuthCookieOptions());
  }
}

export async function createAiOnboardingUser({
  profile,
  privyId,
  fallbackEmail,
  ethereumWallet,
  solanaWallet,
  profilePic,
  dob,
}: CreateAiProfilePayload) {
  const response = await apiFetch(
    buildSwopApiUrl("/api/v2/desktop/user/create"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: profile.name,
        email: profile.email || fallbackEmail || "",
        mobileNo: profile.phone || "",
        address: profile.officeAddress || "",
        bio: profile.bio || "",
        dob: dob || "",
        profilePic: profilePic || "1",
        apt: "",
        countryFlag: "US",
        countryCode: "+1",
        privyId: privyId || "",
        ethereumWallet,
        solanaWallet,
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Failed to create profile" }));
    throw new Error(errorData.message || "Failed to create profile");
  }

  const result = await response.json();
  const createdUser = {
    ...result.data,
    token: result.token as string | undefined,
  };

  persistCreatedUserAuth(createdUser?._id?.toString(), createdUser.token);

  // Fire-and-forget: creating the wallet-balance snapshot can take several
  // seconds and nothing downstream in onboarding needs it, so don't block the UI.
  void apiFetch(buildSwopApiUrl("/api/v5/wallet/create-balance"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ethAddress: ethereumWallet,
      solanaAddress: solanaWallet,
      userId: result.data._id,
    }),
  }).catch((error) => {
    console.error("Error creating wallet balance:", error);
  });

  return createdUser;
}

export async function attachAiOnboardingSmartSiteLinks({
  profile,
  micrositeId,
  accessToken,
}: {
  profile: Pick<AiOnboardingProfile, "name" | "email" | "bio">;
  micrositeId: string;
  accessToken?: string | null;
}) {
  if (!accessToken || !profile.name.trim()) {
    return null;
  }

  const response = await apiFetch(
    buildSwopApiUrl("/api/v5/social-lookup/smartsite-links"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: profile.name,
        company: profile.bio || undefined,
        email: profile.email || undefined,
        micrositeId,
      }),
    },
  );

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error || "Onboarding social lookup failed");
  }

  return result;
}

export async function createAiOnboardingSocials(
  micrositeId: string,
  profile: AiOnboardingProfile,
) {
  const socialTopInfo: SocialTopInfo = {
    email: profile.email,
    whatsapp: profile.whatsapp,
    facebook: profile.facebook,
    instagram: profile.instagram,
    linkedin: profile.linkedin,
    twitter: profile.twitter,
    tiktok: profile.tiktok,
  };

  const socialLargeInfo: SocialLargeInfo = {
    videoCall: profile.videoCall,
    textMessage: profile.textMessage,
  };

  const infoBarObj = {
    website: profile.website,
    address: profile.officeAddress,
  };

  const infoBar: InfoBarData[] = [];
  for (const key in infoBarObj) {
    const value = infoBarObj[key as keyof typeof infoBarObj];
    if (value) {
      infoBar.push({
        buttonName: key === "website" ? "Website" : "Location",
        iconName: key === "website" ? "Website" : "Location",
        iconPath: "",
        description:
          key === "website"
            ? "This is my personal Website"
            : "This is my Office Address",
        group: "custom",
        title: value,
        link: value,
      });
    }
  }

  const socialTop: SocialTopData[] = [];
  for (const key in socialTopInfo) {
    const value = socialTopInfo[key as keyof SocialTopInfo];
    if (value) {
      socialTop.push({
        name:
          key === "twitter"
            ? "X"
            : key.charAt(0).toUpperCase() + key.slice(1),
        value,
        iconName: key,
        iconPath: "",
        url: socialMediaBaseUrls[key],
        group: socialGroup[key],
      });
    }
  }

  const socialLarge: SocialLargeData[] = [];
  for (const key in socialLargeInfo) {
    const value = socialLargeInfo[key as keyof SocialLargeInfo];
    if (value) {
      socialLarge.push({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value,
        iconName: key,
        iconPath: "",
        url: socialMediaBaseUrls[key],
        group: socialGroup[key],
      });
    }
  }

  // The backend only creates a Contact when `contact` is present, and its
  // schema requires a non-empty mobileNo. Phone is optional in onboarding, so
  // only send the contact card when we actually have a phone number.
  const body: Record<string, unknown> = {
    micrositeId,
    socialTop,
    socialLarge,
    infoBar,
  };

  if (profile.phone?.trim()) {
    body.contact = {
      name: profile.name,
      email: profile.email,
      mobileNo: profile.phone,
      address: profile.officeAddress || "",
      websiteUrl: profile.website || "",
    };
  }

  const response = await apiFetch(
    buildSwopApiUrl("/api/v2/desktop/user/createSocial"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Failed to create SmartSite details" }));
    throw new Error(errorData.message || "Failed to create SmartSite details");
  }

  return response.json();
}

export async function attachSwopIdToSmartSite(micrositeId: string, ens: string) {
  const response = await apiFetch(
    buildSwopApiUrl("/api/v2/desktop/user/addSocial"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: "ensDomain",
        micrositeId,
        domain: ens,
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Failed to attach SwopID" }));
    throw new Error(errorData.message || "Failed to attach SwopID");
  }

  return response.json();
}
