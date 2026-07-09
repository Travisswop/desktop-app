"use server";

// export const maxDuration = 60;

import { revalidatePath } from "next/cache";

export async function handleCreateSmartSite(smartSiteInfo: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(smartSiteInfo),
      }
    );
    revalidatePath(`/smartsites`);
    revalidatePath(`/`);
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function handleSmartSiteUpdate(smartSiteInfo: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(smartSiteInfo),
      }
    );
    revalidatePath(`/smartsites`);
    revalidatePath(`/`);
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;

    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

// Destructive: deletes the tab AND every template item assigned to it
// (server-side cascade). Callers must confirm with the user first,
// enumerating the content that will be removed.
export async function handleV5SmartSiteTabDelete(
  micrositeId: string,
  tabId: string,
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/${micrositeId}/tab/${encodeURIComponent(tabId)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;

    revalidatePath(`/smartsite/icons/${micrositeId}`);
    revalidatePath(`/smartsite/profile/${micrositeId}`);
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

// Restores the most recently deleted tab (and its cascaded content).
// `trashId` comes from the DELETE tab response; omitted, the backend
// restores the caller's last deletion.
export async function handleV5SmartSiteTabRestore(
  micrositeId: string,
  trashId: string | undefined,
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/${micrositeId}/tab-restore`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(trashId ? { trashId } : {}),
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;

    revalidatePath(`/smartsite/icons/${micrositeId}`);
    revalidatePath(`/smartsite/profile/${micrositeId}`);
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function handleV5SmartSiteUpdate(
  smartSiteInfo: any,
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(smartSiteInfo),
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;

    const micrositeId = data?.data?.micrositeId || smartSiteInfo?._id;
    if (micrositeId) {
      revalidatePath(`/smartsite/icons/${micrositeId}`);
      revalidatePath(`/smartsite/profile/${micrositeId}`);
      revalidatePath(`/smartsites/icons/${micrositeId}`);
    }
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
