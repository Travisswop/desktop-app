"use server";

// export const maxDuration = 60;

import { revalidatePath } from "next/cache";

export async function postContactCard(contactCardInfo: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/contact`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contactCardInfo),
      }
    );
    revalidatePath(`/smartsites/icons/${contactCardInfo.micrositeId}`);
    const data = await response.json();
    // console.log("data from action", data);

    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
export async function updateContactCard(contactCardInfo: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/contact`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contactCardInfo),
      }
    );
    revalidatePath(`/smartsites/icons/${contactCardInfo.micrositeId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function handleDeleteContactCard(
  contactCardInfo: any,
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/contact`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contactCardInfo),
      }
    );
    revalidatePath(`/smartsites/icons/${contactCardInfo.micrositeId}`);
    const data = await response.json();
    // console.log("data from action", data);
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
