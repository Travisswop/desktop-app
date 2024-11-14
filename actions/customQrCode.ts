"use server";

import { revalidatePath } from "next/cache";

export async function postCustomQrCode(payload: any, token: string) {
  try {
    // console.log(payload);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/customQrCode`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    revalidatePath(`/`);
    // console.log("response", response);

    const data = await response.json();
    // console.log("data from hola", data);
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function postUserCustomQrCode(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/user/generateCustomQRCode`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    revalidatePath(`/qr-code`);
    revalidatePath(`/`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from create custom qr code action:", error);
  }
}
export async function updateUserCustomQrCode(
  payload: any,
  token: any,
  id: string
) {
  try {
    // console.log("sessionfff", session);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/user/customQRCodes/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    revalidatePath(`/qr-code`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from update custom qr code action:", error);
  }
}

export async function deleteQrCode(id: any, token: string) {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/user/customQRCodes/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      }
    );
    revalidatePath(`/qr-code`);
  } catch (error) {
    console.error("Error from create custom qr code action:", error);
  }
}
