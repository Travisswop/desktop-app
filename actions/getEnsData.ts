"use server";
export async function getEnsDataUsingEns(ens: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/wallet/getEnsAddress/${ens}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
// export const getConnectionsUserData = async() =>

export const getConnectionsUserData = async (url: string, token: string) => {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
};

// export const getSearchUserData = async (url:string, token:string) => {
//   try {
//     const response = await fetch(url, {
//       method: "GET",
//       headers: {
//         Accept: "application/json",
//         "Content-Type": "application/json",
//         authorization: `Bearer ${token}`,
//       },
//     });
//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error("Error from action:", error);
//   }
// };
