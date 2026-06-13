'use server';
// export const maxDuration = 60;
export async function handleSignUp(userInfo: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/user/signup`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userInfo),
      }
    );
    const data = await response.json();

    return data;
  } catch (error) {
    console.error('Error from action:', error);
    return error;
  }
}
