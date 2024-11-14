"use server";

import { revalidatePath } from "next/cache";

export async function createWalletAction(
  ens: string,
  micrositeId: any,
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/wallet/createWallet/${ens}`
    );
    const data = await response.json();

    const ensId = `${ens}.swop.id`;

    //update microsite with _id (micrositeId), ens, primary
    if (data) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ _id: micrositeId, ens: ensId }),
      });

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/ens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ micrositeId: micrositeId, domain: ensId }),
      });
    }
    revalidatePath("/");
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
