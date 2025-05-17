'use server';

import logger from '../utils/logger';

export async function createOrder(info: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/createOrder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(info),
      }
    );
    const data = await response.json();
    logger.log('🚀 ~ createOrder ~ data:', data);
    return data;
  } catch (error) {
    logger.error('Error from action:', error);
  }
}
