'use server';

// export const maxDuration = 60;

import { revalidatePath } from 'next/cache';

export async function createMarketPlace(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/createMarketPlace`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    if (response.ok) {
      // revalidatePath(`/smartsites/icons/${payload.micrositeId}`);
      const data = await response.json();
      console.log('🚀 ~ createMarketPlace ~ data:', data);
      return data;
    }
  } catch (error) {
    console.error('Error from action:', error);
    return null;
  }
}

export async function handleDeleteMarketPlace(
  payload: any,
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/createMarketPlace`,
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
    // console.log("data from action", data);
    return data;
  } catch (error) {
    console.error('Error from action:', error);
  }
}
