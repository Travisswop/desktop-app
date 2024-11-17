// const response = await fetch(
//   `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/user/${userDetails._id}`,
//   {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//       authorization: `Bearer ${userDetails.accessToken}`,
//     },
//   }
// );
// const data = await response.json();

"use server";
export async function fetchUserInfo(id: string, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/user/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      }
    );
    const data = response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
