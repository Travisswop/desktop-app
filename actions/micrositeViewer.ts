import { cookies } from "next/headers";

export async function createMicrositeViewer(payload: any) {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/microsite/createviewer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  } catch (error) {
    console.error("Error from add swop point:", error);
  }
}

export async function getMicrositeViewer() {
  try {
    const cookieStore = cookies();
    const accessToken = (await cookieStore).get("access-token")?.value;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/microsite/getviewer`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = response.json();

    return data;
  } catch (error) {
    console.error("Error from add swop point:", error);
  }
}
