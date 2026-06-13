"use server";
import { revalidatePath } from "next/cache";

export async function handleDeleteSmartSite(id: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ _id: id }),
      }
    );
    revalidatePath(`/`);
    revalidatePath(`/smartsites`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
