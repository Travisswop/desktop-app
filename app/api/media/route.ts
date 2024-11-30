import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const userId = request.cookies.get('user-id')?.value;
  console.log('🚀 ~ POST ~ userId:', userId);
  const { audioList, videoList } = await request.json();

  // Process the audio and video URLs as needed
  console.log('Received audio:', audioList);
  console.log('Received video:', videoList);

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioList, videoList }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch media data');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching media data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media data' },
      { status: 500 }
    );
  }
}
