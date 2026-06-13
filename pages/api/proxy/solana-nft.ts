import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { endpoint, requestBody } = req.body;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in solana-nft proxy:', error);
    res.status(500).json({ error: 'Failed to fetch data from Metaplex API' });
  }
}
