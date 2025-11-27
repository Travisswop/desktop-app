"use server";

// export const maxDuration = 60;

export async function createMarketPlace(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/createMarketPlace`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    if (response.ok) {
      // revalidatePath(`/smartsites/icons/${payload.micrositeId}`);
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error("Error from action:", error);
    return null;
  }
}

export async function handleDeleteMarketPlace(payload: any, token: string) {
  console.log("payload server", payload);
  console.log("payload token server", token);

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/createMarketPlace`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    // revalidatePath(`/smartsite/profile/${payload.micrositeId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
