'use server';

export async function getTransactionData(walletInfo: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/wallet/transactionsList`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(walletInfo),
      },
    );
    //   revalidatePath(`/smartsites/icons/${contactCardInfo.micrositeId}`);
    const data = response.json();
    // console.log("data from action", data);

    return data;
  } catch (error) {
    console.error('Error from action:', error);
  }
}
