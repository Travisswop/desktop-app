'use server';

import { cache } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getUserData = cache(async (username: string) => {
  const res = await fetch(
    `${API_URL}/api/v2/desktop/user/seller/${username}`,
    {
      cache: 'no-store',
    }
  );
  if (!res.ok) {
    throw new Error('Failed to fetch user data');
  }

  const { data } = await res.json();

  if (username.includes('.swop.id')) {
    return {
      redirect: true,
      data,
    };
  }

  return {
    redirect: false,
    data,
  };
});
