'use server';

import { v4 as uuidv4 } from 'uuid';

export async function postKycInBridge(options: any) {
  try {
    const response = await fetch(
      `https://api.bridge.xyz/v0/kyc_links`,
      options
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error from action:', error);
  }
}
export async function postExternalAccountInBridge(
  customerId: string,
  options: any
) {
  try {
    const response = await fetch(
      `https://api.bridge.xyz/v0/customers/${customerId}/external_accounts`,
      options
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function postExternalAccountInSwopDB(
  userId: string,
  data: any
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/user/saveBrigeAccount`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Make sure to set the correct content type
        },
        body: JSON.stringify({ user_id: userId, data }), // Convert data to JSON before sending
      }
    );
    const res = await response.json();
    return res;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function saveQycInfoToSwopDB(data: any, userId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/user/saveKyc`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Make sure to set the correct content type
        },
        body: JSON.stringify({ ...data, user_id: userId }), // Convert data to JSON before sending
      }
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function saveVirtualInfoToSwopDB(
  data: any,
  userId: string,
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/user/saveVirtualAccount`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Make sure to set the correct content type
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, data }), // !need to be sure
      }
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function getDBExternalAccountInfo(
  userId: string,
  accessToken: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/user/getBridgeAccount/${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json', // Make sure to set the correct content type
          authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function getVirtualAccountInfo(
  userId: string,
  accessToken: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/user/getVirtualAccount/${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json', // Make sure to set the correct content type
          authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function getVirtualAccountInfoFromBridge(
  customerId: string,
  options: any
) {
  try {
    const response = await fetch(
      `https://api.bridge.xyz/v0/customers/${customerId}/virtual_accounts`,
      options
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function postVirtualAccountInfoIntoBridge(
  customerId: string,
  options: any
) {
  try {
    const response = await fetch(
      `https://api.bridge.xyz/v0/customers/${customerId}/virtual_accounts`,
      options
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function getKycInfo(
  userId: string,
  accessToken: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/user/getUserKyc/${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json', // Make sure to set the correct content type
          authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export async function getKycInfoFromBridge(
  options: any,
  customerId: string
) {
  try {
    const response = await fetch(
      `https://api.bridge.xyz/v0/kyc_links/${customerId}`,
      options
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error from action:', error);
  }
}

export const createBridgePayment = async (
  network: string,
  Source_wallet: string,
  bankId: string,
  customerId: string,
  amount: string
) => {
  try {
    const body = {
      source: {
        currency: 'usdc',
        payment_rail: network,
        from_address: Source_wallet,
      },
      destination: {
        currency: 'usd',
        payment_rail: 'wire',
        external_account_id: bankId,
      },
      amount: amount,
      on_behalf_of: customerId,
      developer_fee: (Number(amount) * 0.005)?.toFixed(2),
    };

    const apiKey = process.env.NEXT_PUBLIC_BRIDGE_SECRET;

    const options: any = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'Api-Key': apiKey,
        'Idempotency-Key': uuidv4()?.toString(),
      },
      body: JSON.stringify(body),
    };

    const response = await fetch(
      'https://api.bridge.xyz/v0/transfers',
      options
    );
    const data = await response.json();

    if (
      data?.source_deposit_instructions &&
      data?.source_deposit_instructions?.to_address
    ) {
      return data?.source_deposit_instructions?.to_address;
    } else {
      return false;
    }
  } catch (e) {
    return false;
  }
};
