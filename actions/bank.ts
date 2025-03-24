"use server";

// import { cookies } from "next/headers";

export async function postKycInBridge(options: any) {
  try {
    const response = await fetch(
      `https://api.bridge.xyz/v0/kyc_links`,
      options
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
export async function postExternalAccountInBridge(
  customerId: string,
  options: any
) {
  try {
    const response = await fetch(
      `https://api.bridge.xyz/v0/customers/${customerId}/external_accounts`,
      options
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function saveQycInfoToSwopDB(data: any, userId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/user/saveKyc`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Make sure to set the correct content type
        },
        body: JSON.stringify({ ...data, user_id: userId }), // Convert data to JSON before sending
      }
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function getDBExternalAccountInfo(userId: string) {
  // const cookieStore = cookies();
  // const userId = (await cookieStore).get("user-id")?.value;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/user/getBridgeAccount/${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json", // Make sure to set the correct content type
        },
      }
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function getKycInfo(userId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/user/getUserKyc/${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json", // Make sure to set the correct content type
        },
      }
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function getKycInfoFromBridge(options: any, customerId: string) {
  try {
    const response = await fetch(
      `https://api.bridge.xyz/v0/kyc_links/${customerId}`,
      options
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
