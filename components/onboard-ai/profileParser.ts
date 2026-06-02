import type { AiOnboardingProfile } from "./types";

export const EMPTY_PROFILE: AiOnboardingProfile = {
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

const PLATFORM_FIELDS = [
  {
    field: "instagram",
    labels: ["instagram", "insta", "ig"],
    host: "instagram.com",
  },
  {
    field: "twitter",
    labels: ["twitter", "x"],
    host: "x.com",
  },
  {
    field: "linkedin",
    labels: ["linkedin", "linked in"],
    host: "linkedin.com",
  },
  {
    field: "tiktok",
    labels: ["tiktok", "tik tok"],
    host: "tiktok.com",
  },
  {
    field: "facebook",
    labels: ["facebook", "fb"],
    host: "facebook.com",
  },
] as const;

const cleanValue = (value: string) =>
  value
    .trim()
    .replace(/^[=: -]+/, "")
    .replace(/[.,;]+$/, "")
    .trim();

const assignIfPresent = (
  next: AiOnboardingProfile,
  field: keyof AiOnboardingProfile,
  value?: string | null,
) => {
  const cleaned = value ? cleanValue(value) : "";
  if (cleaned) next[field] = cleaned;
};

const matchField = (message: string, labels: readonly string[]) => {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = message.match(
      new RegExp(`(?:^|\\n|\\s)${escaped}\\s*(?:is|:|=|-)?\\s*([^\\n,;]+)`, "i"),
    );

    if (match?.[1]) return match[1];
  }

  return "";
};

export function extractProfileDetails(
  current: AiOnboardingProfile,
  message: string,
): AiOnboardingProfile {
  const next = { ...current };
  const normalized = message.replace(/\s+/g, " ").trim();

  assignIfPresent(
    next,
    "email",
    normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0],
  );
  assignIfPresent(
    next,
    "phone",
    normalized.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0],
  );
  assignIfPresent(next, "name", matchField(message, ["name", "my name"]));
  assignIfPresent(next, "bio", matchField(message, ["bio", "about", "description"]));
  assignIfPresent(
    next,
    "officeAddress",
    matchField(message, ["address", "location", "office"]),
  );
  assignIfPresent(next, "website", matchField(message, ["website", "site"]));
  assignIfPresent(next, "whatsapp", matchField(message, ["whatsapp"]));
  assignIfPresent(next, "textMessage", matchField(message, ["text", "sms"]));
  assignIfPresent(next, "videoCall", matchField(message, ["video", "facetime"]));

  const urls = normalized.match(/(?:https?:\/\/|www\.)[^\s,;]+/gi) || [];
  for (const url of urls) {
    const lowerUrl = url.toLowerCase();
    const platform = PLATFORM_FIELDS.find((item) => lowerUrl.includes(item.host));

    if (platform) {
      next[platform.field] = cleanValue(url);
    } else if (!next.website) {
      next.website = cleanValue(url);
    }
  }

  for (const platform of PLATFORM_FIELDS) {
    const value = matchField(message, platform.labels);
    if (value) next[platform.field] = cleanValue(value);
  }

  if (!next.name) {
    const introMatch = normalized.match(/(?:i am|i'm|im)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/);
    if (introMatch?.[1]) next.name = cleanValue(introMatch[1]);
  }

  if (!next.bio && normalized.length > 35 && !normalized.includes("@")) {
    next.bio = normalized;
  }

  return next;
}

export function getNextAssistantPrompt(profile: AiOnboardingProfile) {
  if (!profile.name) {
    return "Great. What name should I put on your profile?";
  }

  if (!profile.bio) {
    return `Nice to meet you, ${profile.name}. Tell me a short bio or what you want people to know when they open your SmartSite.`;
  }

  if (
    !profile.instagram &&
    !profile.twitter &&
    !profile.linkedin &&
    !profile.tiktok &&
    !profile.website
  ) {
    return "Drop your main links next. Instagram, X, LinkedIn, TikTok, website, anything you want shown.";
  }

  if (!profile.email && !profile.phone) {
    return "Any contact info you want included, like email, phone, WhatsApp, or an office address?";
  }

  return "I have enough to build the profile. You can add more details, or review and save it now.";
}

export function hasEnoughToSave(profile: AiOnboardingProfile) {
  return Boolean(profile.name.trim());
}
