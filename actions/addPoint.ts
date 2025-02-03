export async function addSwopPoint(payload: any) {
  console.log('🚀 ~ addSwopPoint ~ payload:', payload);
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Error from add swop point:', error);
  }
}
