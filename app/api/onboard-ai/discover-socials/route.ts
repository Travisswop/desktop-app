import { NextResponse } from "next/server";
import type { DiscoveredSocialCandidate } from "@/components/onboard-ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BraveResult = {
  title?: string;
  url?: string;
  description?: string;
};

type DiscoverRequest = {
  name?: string;
  bio?: string;
  email?: string;
  website?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  tiktok?: string;
};

type ParsedDiscoverRequest =
  | { payload: DiscoverRequest }
  | { error: string };

const platforms = [
  {
    platform: "twitter",
    label: "X",
    domains: ["x.com", "twitter.com"],
    queryName: "X Twitter",
  },
  {
    platform: "linkedin",
    label: "LinkedIn",
    domains: ["linkedin.com"],
    queryName: "LinkedIn",
  },
  {
    platform: "facebook",
    label: "Facebook",
    domains: ["facebook.com"],
    queryName: "Facebook",
  },
  {
    platform: "instagram",
    label: "Instagram",
    domains: ["instagram.com"],
    queryName: "Instagram",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    domains: ["tiktok.com"],
    queryName: "TikTok",
  },
] as const;

const SEARCH_TIMEOUT_MS = 8000;

const clean = (value?: string) => value?.trim() || "";

const extractHandle = (value?: string) => {
  const cleaned = clean(value)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");

  const parts = cleaned.split("/");
  const last = parts[parts.length - 1] || cleaned;
  return last.replace(/^@/, "").trim();
};

const normalizeUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
};

const getHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const includesDomain = (url: string, domains: readonly string[]) => {
  const host = getHost(url);
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
};

const scoreResult = ({
  result,
  domains,
  seedHandles,
  name,
}: {
  result: BraveResult;
  domains: readonly string[];
  seedHandles: string[];
  name: string;
}) => {
  const haystack = `${result.title || ""} ${result.url || ""} ${
    result.description || ""
  }`.toLowerCase();

  let score = 0;
  if (result.url && includesDomain(result.url, domains)) score += 40;

  for (const handle of seedHandles) {
    if (handle && haystack.includes(handle.toLowerCase())) score += 30;
  }

  const nameTokens = name
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2);
  const matchedNameTokens = nameTokens.filter((token) => haystack.includes(token));
  if (nameTokens.length && matchedNameTokens.length === nameTokens.length) {
    score += 20;
  } else if (matchedNameTokens.length) {
    score += 10;
  }

  if (haystack.includes("profile")) score += 5;
  return Math.min(score, 95);
};

const getSearchSignal = () => {
  if ("timeout" in AbortSignal) {
    return AbortSignal.timeout(SEARCH_TIMEOUT_MS);
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  return controller.signal;
};

const parseDiscoverRequest = async (
  request: Request,
): Promise<ParsedDiscoverRequest> => {
  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { error: "Request body must be a JSON object." };
    }

    return { payload: payload as DiscoverRequest };
  } catch {
    return { error: "Invalid JSON payload." };
  }
};

async function braveSearch(query: string) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return { results: [], warning: "BRAVE_SEARCH_API_KEY is not configured." };
  }

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
      q: query,
      count: "5",
      country: "us",
      search_lang: "en",
      safesearch: "strict",
    })}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      next: { revalidate: 0 },
      signal: getSearchSignal(),
    },
  );

  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  const data = await response.json();
  return {
    results: (data.web?.results || []) as BraveResult[],
    warning: "",
  };
}

const resultToCandidate = ({
  result,
  platform,
  label,
  domains,
  seedHandles,
  name,
  minConfidence,
  maxConfidence = 95,
}: {
  result: BraveResult;
  platform: DiscoveredSocialCandidate["platform"];
  label: string;
  domains: readonly string[];
  seedHandles: string[];
  name: string;
  minConfidence: number;
  maxConfidence?: number;
}) => {
  if (!result.url) return null;

  const confidence = Math.min(
    scoreResult({
      result,
      domains,
      seedHandles,
      name,
    }),
    maxConfidence,
  );

  if (confidence < minConfidence) return null;

  return {
    platform,
    label,
    value: normalizeUrl(result.url),
    url: normalizeUrl(result.url),
    sourceTitle: result.title || label,
    sourceUrl: normalizeUrl(result.url),
    snippet: result.description || "",
    confidence,
  } satisfies DiscoveredSocialCandidate;
};

export async function POST(request: Request) {
  const parsed = await parseDiscoverRequest(request);
  if ("error" in parsed) {
    return NextResponse.json(
      { candidates: [], error: parsed.error },
      { status: 400 },
    );
  }

  try {
    const { payload } = parsed;
    const name = clean(payload.name);
    const seedHandles = [
      payload.instagram,
      payload.twitter,
      payload.linkedin,
      payload.facebook,
      payload.tiktok,
      payload.website,
      payload.email?.split("@")[0],
      name,
    ]
      .map(extractHandle)
      .filter(Boolean);

    const baseSeed = [name, seedHandles[0], payload.bio]
      .filter(Boolean)
      .join(" ")
      .slice(0, 160);

    if (!baseSeed) {
      return NextResponse.json({
        candidates: [],
        warning: "Add a name or one known social handle before searching.",
      });
    }

    const searches = await Promise.allSettled([
      ...platforms.map(async (item) => {
        const search = await braveSearch(
          `${baseSeed} ${item.queryName} ${item.domains[0]}`,
        );
        const candidates = search.results
          .filter((result) => result.url && includesDomain(result.url, item.domains))
          .map((result) =>
            resultToCandidate({
              result,
              platform: item.platform,
              label: item.label,
              domains: item.domains,
              seedHandles,
              name,
              minConfidence: 45,
            }),
          )
          .filter(Boolean) as DiscoveredSocialCandidate[];

        return { candidates, warning: search.warning };
      }),
      (async () => {
        const search = await braveSearch(`${baseSeed} official website`);
        const candidates: DiscoveredSocialCandidate[] = [];

        for (const result of search.results) {
          if (!result.url) continue;
          const host = getHost(result.url);
          const isSocial = platforms.some((item) =>
            includesDomain(result.url!, item.domains),
          );
          if (!host || isSocial) continue;

          const candidate = resultToCandidate({
            result,
            platform: "website",
            label: "Website",
            domains: [host],
            seedHandles,
            name,
            minConfidence: 35,
            maxConfidence: 85,
          });

          if (candidate) candidates.push(candidate);
        }

        return { candidates, warning: search.warning };
      })(),
    ]);

    const candidates: DiscoveredSocialCandidate[] = [];
    let warning = "";
    const errors: string[] = [];

    for (const search of searches) {
      if (search.status === "fulfilled") {
        candidates.push(...search.value.candidates);
        warning = warning || search.value.warning;
      } else {
        errors.push(
          search.reason instanceof Error
            ? search.reason.message
            : "Search provider failed.",
        );
      }
    }

    if (!candidates.length && errors.length) {
      throw new Error(errors[0]);
    }

    const seen = new Set<string>();
    const deduped = candidates
      .sort((a, b) => b.confidence - a.confidence)
      .filter((candidate) => {
        const key = `${candidate.platform}:${candidate.url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter((candidate, index, all) => {
        return (
          all.findIndex((item) => item.platform === candidate.platform) === index
        );
      });

    return NextResponse.json({ candidates: deduped, warning });
  } catch (error) {
    console.error("Social discovery failed:", error);
    return NextResponse.json(
      {
        candidates: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to discover social links.",
      },
      { status: 500 },
    );
  }
}
