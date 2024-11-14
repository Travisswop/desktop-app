"use server";

// export const maxDuration = 60;

import { revalidatePath } from "next/cache";

export async function postInfoBar(info: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/infobar`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(info),
      }
    );
    revalidatePath(`/smartsites/icons/${info.micrositeId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function updateInfoBar(info: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/infobar`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(info),
      }
    );
    revalidatePath(`/smartsites/icons/${info.micrositeId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function deleteInfoBar(info: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/infobar`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(info),
      }
    );
    revalidatePath(`/smartsites/icons/${info.micrositeId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
