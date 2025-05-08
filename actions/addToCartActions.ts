'use server';

import { revalidatePath } from 'next/cache';

export async function addProductToCart(
  payload: any,
  token: string,
  userName: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/orders/addToCart`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || 'Failed to add item to cart'
      );
    }

    const data = await response.json();
    revalidatePath(`/sp/${userName}`);
    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to add item to cart';
    throw new Error(errorMessage);
  }
}

export async function getCartData(token: string, parentId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/userCart`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || 'Failed to fetch cart data'
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch cart data';
    throw new Error(errorMessage);
  }
}

export async function getNftDetails(payload: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getNftDetails`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cartItems: payload }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || 'Failed to get NFT details'
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to get NFT details';
    throw new Error(errorMessage);
  }
}

export async function updateCartQuantity(
  payload: any,
  token: string,
  userName: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/updateCart`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || 'Failed to update cart quantity'
      );
    }

    const data = await response.json();
    revalidatePath(`/sp/${userName}/cart`);
    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to update cart quantity';
    throw new Error(errorMessage);
  }
}

export async function deleteCartItem(
  id: string,
  token: string,
  userName: string,
  sellerId: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/orders/deleteCartItem`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cartId: id, sellerId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || 'Failed to remove item from cart'
      );
    }

    const data = await response.json();
    revalidatePath(`/sp/${userName}/cart`);
    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to remove item from cart';
    throw new Error(errorMessage);
  }
}
