"use server";

import { revalidatePath } from "next/cache";

/**
 * Fetch token gating configuration for a microsite
 * @param micrositeId - The ID of the microsite
 * @param token - JWT authentication token
 * @returns Token gating configuration data
 */
export async function getTokenGating(micrositeId: string, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/token-gating/${micrositeId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch token gating: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching token gating configuration:", error);
    throw error;
  }
}

/**
 * Create or update token gating configuration for a microsite
 * @param micrositeId - The ID of the microsite
 * @param tokenGatingData - Token gating configuration data
 * @param token - JWT authentication token
 * @returns Updated token gating configuration
 */
export async function updateTokenGating(
  micrositeId: string,
  tokenGatingData: {
    isOn: boolean;
    tokenType: "NFT" | "Token";
    selectedToken: string;
    forwardLink: string;
    minRequired?: number;
    coverImage?: string;
    network: "SOLANA" | "ethereum" | "polygon" | "base";
  },
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/token-gating/${micrositeId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(tokenGatingData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update token gating: ${response.statusText}`);
    }

    const data = await response.json();

    // Revalidate relevant paths
    revalidatePath(`/smartsite/token-gated/${micrositeId}`);
    revalidatePath(`/smartsites`);

    return data;
  } catch (error) {
    console.error("Error updating token gating configuration:", error);
    throw error;
  }
}

/**
 * Delete/reset token gating configuration for a microsite
 * @param micrositeId - The ID of the microsite
 * @param token - JWT authentication token
 * @returns Success response
 */
export async function deleteTokenGating(micrositeId: string, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/token-gating/${micrositeId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete token gating: ${response.statusText}`);
    }

    const data = await response.json();

    // Revalidate relevant paths
    revalidatePath(`/smartsite/token-gated/${micrositeId}`);
    revalidatePath(`/smartsites`);

    return data;
  } catch (error) {
    console.error("Error deleting token gating configuration:", error);
    throw error;
  }
}
