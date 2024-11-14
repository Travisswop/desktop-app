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
    const data = await response.json();
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
    const data = await response.json();
    // console.log("data from action", data);

    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
