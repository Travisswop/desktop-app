import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface UserData {
  name: string;
  email: string;
  mobileNo: string;
  address: string;
  bio: string;
  dob: string;
  profilePic: string;
  apt: string;
  countryFlag: string;
  countryCode: string;
  privyId: string;
  ethereumWallet?: string;
  solanaWallet?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();

    console.log('Received user data:', {
      name: data.name,
      email: data.email,
      hasEthereumWallet: !!data.ethereumWallet,
      hasSolanaWallet: !!data.solanaWallet,
      privyId: data.privyId,
    });

    const formatData: UserData = {
      name: data.name,
      email: data.email,
      mobileNo: data.mobileNo || '',
      address: data.address || '',
      bio: data.bio || '',
      dob: data.dob || '',
      profilePic: data.profilePic || '',
      apt: data.apt || '',
      countryFlag: data.countryFlag || 'US',
      countryCode: data.countryCode || 'US',
      privyId: data.privyId || '',
      ethereumWallet: data.ethereumWallet,
      solanaWallet: data.solanaWallet,
    };
    // Call your backend API with the sanitized data
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    console.log('API URL:', apiUrl);

    if (!apiUrl) {
      console.error('NEXT_PUBLIC_API_URL is not set');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    const fullUrl = `${apiUrl}/api/v4/user/signup`;
    console.log('Making request to:', fullUrl);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...formatData }),
    });

    console.log('Response status:', response.status);
    console.log(
      'Response headers:',
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: 'Unknown error' }));
      console.error('Backend API error:', errorData);
      throw new Error(errorData.message || 'Failed to create user');
    }

    const result = await response.json();
    console.log('Success response:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {
        error: 'Failed to create user and smartsite',
        details:
          error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
