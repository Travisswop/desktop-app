"use server";

// export const maxDuration = 60;

import { revalidatePath } from "next/cache";

export async function handleSmallIcon(smallIconInfo: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/socialSmall`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(smallIconInfo),
      }
    );
    revalidatePath(`/smartsites/icons/${smallIconInfo.micrositeId}`);
    const data = await response.json();
    // console.log("data from action", data);

    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function handleUpdateSmallIcon(smallIconInfo: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/socialSmall`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(smallIconInfo),
      }
    );
    revalidatePath(`/smartsites/icons/${smallIconInfo.micrositeId}`);
    const data = await response.json();
    // console.log("data from action", data);
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function handleDeleteSmallIcon(smallIconInfo: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/socialSmall`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(smallIconInfo),
      }
    );
    revalidatePath(`/smartsites/icons/${smallIconInfo.micrositeId}`);
    const data = await response.json();
    // console.log("data from action", data);
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
