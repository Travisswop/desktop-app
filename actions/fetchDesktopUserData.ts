"use server";
export async function fetchUserInfo(id: string, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/user/${id}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    return data?.data;
  } catch (error) {
    console.error("Error from fetchUserInfo action:", error);
  }
}

export async function fetchAnalyticsInfo(token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/analytics`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    return data?.data;
  } catch (error) {
    console.error("Error from fetchAnalyticsInfo action:", error);
  }
}
