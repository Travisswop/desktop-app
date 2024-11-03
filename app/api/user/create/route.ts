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

    const formatData: UserData = {
      name: data.name,
      email: data.email,
      mobileNo: data.phone || '',
      address: `${data.apartment || ''} ${data.address || ''}`.trim(),
      bio: data.bio || '',
      dob: data.birthdate || '',
      profilePic: data.avatar || '',
    };

    // Call your backend API with the sanitized data
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formatData }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend API error:', errorData);
      throw new Error(errorData.message || 'Failed to create user');
    }

    const result = await response.json();
    console.log('🚀 ~ POST ~ result:', result);
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
