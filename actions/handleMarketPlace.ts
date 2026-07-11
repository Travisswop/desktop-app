"use server";

import { revalidatePath } from "next/cache";

// export const maxDuration = 60;

export async function createMarketPlace(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/createMarketPlace`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    if (response.ok) {
      revalidatePath(`/smartsite/profile/${payload.micrositeId}`);
      revalidatePath(`/smartsite/icons/${payload.micrositeId}`);
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error("Error from action:", error);
    return null;
  }
}

export async function handleDeleteMarketPlace(payload: any, token: string) {
  console.log("payload server", payload);
  console.log("payload token server", token);

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/createMarketPlace`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    revalidatePath(`/smartsite/profile/${payload.micrositeId}`);
    revalidatePath(`/smartsite/icons/${payload.micrositeId}`);
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function renameMarketplaceCategory(
  payload: { micrositeId: string; currentTitle: string; nextTitle: string },
  token: string,
) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/marketplace-category/${payload.micrositeId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentTitle: payload.currentTitle, nextTitle: payload.nextTitle }),
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) return null;
  revalidatePath(`/smartsite/icons/${payload.micrositeId}`);
  return data;
}

export async function deleteMarketplaceCategory(
  payload: { micrositeId: string; title: string },
  token: string,
) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/marketplace-category/${payload.micrositeId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: payload.title }),
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) return null;
  revalidatePath(`/smartsite/icons/${payload.micrositeId}`);
  return data;
}
