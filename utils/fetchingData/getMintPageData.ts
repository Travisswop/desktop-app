'use server';

export async function getMintPageData(token: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getCollections`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      console.error('API error:', res.statusText); // Log the error
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching mint page data:', error); // Log any other errors
    return null;
  }
}

export default getMintPageData;
