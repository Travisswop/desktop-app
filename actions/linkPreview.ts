"use server";

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

/**
 * Fetch Open Graph metadata for a URL via the backend
 * (POST /api/v5/microsite/link-preview). Used to prefill empty
 * title/description fields in the Add-template forms. Returns null on any
 * failure — callers must fail silently (no error toast).
 */
export async function fetchLinkPreview(url: string, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/link-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    return (data?.data as LinkPreviewData | undefined) ?? null;
  } catch (error) {
    console.error("Error from action:", error);
    return null;
  }
}
