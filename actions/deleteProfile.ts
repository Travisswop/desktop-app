"use server";

export const deleteUserAccount = async ({ payload }: any) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/delete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to delete account");
  }
};
