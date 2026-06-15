import { sanitizeNextImageSrc } from "@/lib/sanitizeNextImageSrc";

const FALLBACK_AVATAR = "/images/user_avator/placeholder.png";

type UnknownRecord = Record<string, unknown>;

export interface TipRecipient {
  ens: string;
  name: string;
  image: string;
  solanaWalletAddress: string;
  evmWalletAddress: string;
  walletAddress: string;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }

  return "";
}

function nestedRecord(record: UnknownRecord, key: string) {
  return asRecord(record[key]);
}

function looksLikeEvmAddress(value: string) {
  return /^0x[a-f0-9]{40}$/i.test(value);
}

function avatarSrc(profilePic: string) {
  if (!profilePic) return FALLBACK_AVATAR;
  if (
    /^https?:\/\//i.test(profilePic) ||
    /^data:/i.test(profilePic) ||
    /^blob:/i.test(profilePic) ||
    profilePic.startsWith("/")
  ) {
    return sanitizeNextImageSrc(profilePic) || FALLBACK_AVATAR;
  }

  return sanitizeNextImageSrc(`/images/user_avator/${profilePic}@3x.png`);
}

export function resolveTipRecipient(feedItem: unknown): TipRecipient {
  const feed = asRecord(feedItem);
  const smartsiteId = asRecord(feed.smartsiteId);
  const smartsiteDetails = asRecord(feed.smartsiteDetails);
  const detailsEnsData = nestedRecord(smartsiteDetails, "ensData");
  const idEnsData = nestedRecord(smartsiteId, "ensData");
  const detailsAddresses = nestedRecord(detailsEnsData, "addresses");
  const idAddresses = nestedRecord(idEnsData, "addresses");

  const ens = firstString(
    smartsiteDetails.ens,
    smartsiteId.ens,
    feed.smartsiteEnsName,
    detailsEnsData.ens,
    detailsEnsData.name,
    idEnsData.ens,
    idEnsData.name,
  );
  const name =
    firstString(
      smartsiteDetails.name,
      smartsiteId.name,
      feed.smartsiteUserName,
      feed.userName,
    ) ||
    ens ||
    "Unknown";
  const image = avatarSrc(
    firstString(
      smartsiteDetails.profilePic,
      smartsiteId.profilePic,
      feed.smartsiteProfilePic,
      feed.userProfilePic,
    ),
  );
  const solanaWalletAddress = firstString(
    detailsAddresses["501"],
    idAddresses["501"],
    smartsiteDetails.solanaWallet,
    smartsiteDetails.solanaAddress,
    smartsiteId.solanaWallet,
    smartsiteId.solanaAddress,
  );
  const evmWalletAddress = firstString(
    detailsAddresses["60"],
    idAddresses["60"],
    smartsiteDetails.ethereumWallet,
    smartsiteDetails.evmAddress,
    smartsiteId.ethereumWallet,
    smartsiteId.evmAddress,
  );
  const walletAddress = firstString(
    smartsiteDetails.walletAddress,
    smartsiteId.walletAddress,
    feed.smartsiteWalletAddress,
    solanaWalletAddress,
    evmWalletAddress,
  );

  return {
    ens,
    name,
    image,
    solanaWalletAddress,
    evmWalletAddress,
    walletAddress,
  };
}

export function resolveTipRecipientAddress({
  recipient,
  ensData,
  chain,
}: {
  recipient: TipRecipient;
  ensData?: unknown;
  chain?: string | null;
}) {
  const normalizedChain = String(chain || "").toUpperCase();
  const isSolana = normalizedChain === "SOLANA";
  const data = asRecord(ensData);
  const addresses = nestedRecord(data, "addresses");

  return isSolana
    ? firstString(
        addresses["501"],
        data.solanaAddress,
        recipient.solanaWalletAddress,
        looksLikeEvmAddress(recipient.walletAddress) ? "" : recipient.walletAddress,
      )
    : firstString(
        addresses["60"],
        data.evmAddress,
        data.ethereumAddress,
        recipient.evmWalletAddress,
        looksLikeEvmAddress(recipient.walletAddress) ? recipient.walletAddress : "",
      );
}
