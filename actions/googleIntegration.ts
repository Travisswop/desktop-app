"use server";

/**
 * Owner-side Google Calendar connection for the Booking widget.
 * Wraps the authed /api/v5/integrations/google endpoints.
 */

export interface GoogleIntegrationStatus {
  configured: boolean;
  connected: boolean;
  googleEmail: string;
}

export async function getGoogleIntegrationStatus(
  token: string,
): Promise<GoogleIntegrationStatus | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/integrations/google/status`,
      {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    return data?.data ?? null;
  } catch (error) {
    console.error("Google status fetch failed:", error);
    return null;
  }
}

export async function getGoogleConnectUrl(
  token: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/integrations/google/connect`,
      {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    return data?.data?.url ?? null;
  } catch (error) {
    console.error("Google connect URL fetch failed:", error);
    return null;
  }
}

export async function disconnectGoogleIntegration(token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/integrations/google`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    return data;
  } catch (error) {
    console.error("Google disconnect failed:", error);
    return null;
  }
}
