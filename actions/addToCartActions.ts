"use server";

import { revalidatePath } from "next/cache";
export async function addProductToCart(
  payload: any,
  token: string,
  userName: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/userCart`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    console.log("add to cart post response", data);

    revalidatePath(`/sp/${userName}`);
    return data;
  } catch (error) {
    console.error("Error from add swop point:", error);
  }
}

export async function getCartData(token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/userCart`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    // revalidatePath(`/sp/${appIconInfo.micrositeId}`);
    return data;
  } catch (error) {
    console.error("Error from add swop point:", error);
  }
}

export async function updateCartQuantity(
  payload: any,
  token: string,
  userName: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/userCart/qty`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    revalidatePath(`/sp/${userName}/cart`);
    return data;
  } catch (error) {
    console.error("Error from add swop point:", error);
  }
}

export async function deleteCartItem(
  id: string,
  token: string,
  userName: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/deleteCartItem/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    revalidatePath(`/sp/${userName}/cart`);
    return data;
  } catch (error) {
    console.error("Error removing cart data:", error);
  }
}
