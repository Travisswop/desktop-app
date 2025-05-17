'use server';

import { revalidatePath } from 'next/cache';

export async function createWalletAction(
  ens: string,
  micrositeId: any,
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/wallet/createWallet/${ens}`
    );
    const data = await response.json();

    const ensId = `${ens}.swop.id`;

    //update microsite with _id (micrositeId), ens, primary
    if (data) {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ _id: micrositeId, ens: ensId }),
        }
      );

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/ens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            micrositeId: micrositeId,
            domain: ensId,
          }),
        }
      );
    }
    revalidatePath('/');
    return data;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function createWalletBalance(payload: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/create-balance`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function createLoginWalletBalance(payload: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/create-login-balance`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function getWalletCurrentBalance(payload: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/tokenTotalPrice`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error from action:', error);
  }
}
