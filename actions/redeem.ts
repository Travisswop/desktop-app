'use server';
// export const maxDuration = 60;
import { revalidatePath } from 'next/cache';

export async function updateRedeem(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/redeemLink`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    revalidatePath(`/smartsites/icons/${payload.micrositeId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error from posting redeem link:', error);
  }
}

export async function postRedeem(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/redeemLink`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    revalidatePath(`/smartsites/icons/${payload.micrositeId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error from posting redeem link:', error);
  }
}

export async function deleteRedeem(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/redeemLink`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    revalidatePath(`/smartsites/icons/${payload.micrositeId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error from posting redeem link:', error);
  }
}
