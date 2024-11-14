"use server";
export async function getNewsFeed(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/feed`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
