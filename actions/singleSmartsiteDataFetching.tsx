"use server";
async function getSingleSmartsiteData(id: string, token: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/microsite/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await res.json().catch(() => null);
    if (!res.ok) return null;
    return data;
  } catch (error) {
    console.error(error);
  }
}

export default getSingleSmartsiteData;
