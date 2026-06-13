'use server';

export async function getNftData(
  token: string,
  ethAddress: string,
  solanaAddress: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/wallet/nftList/${ethAddress}/${solanaAddress}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
      }
    );
    //   revalidatePath(`/smartsites/icons/${contactCardInfo.micrositeId}`);
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    return data;
  } catch (error) {
    console.error('Error from action:', error);
  }
}
