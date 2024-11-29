import { useQuery } from '@tanstack/react-query';

const fetchMediaData = async (
  accessToken: string,
  audioList: string[],
  videoList: string[]
) => {
  const response = await fetch('/api/media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ audioList, videoList }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch media data');
  }

  return response.json();
};

export const useFetchMediaData = (
  userId: string,
  accessToken: string,
  audioList: string[],
  videoList: string[]
) => {
  return useQuery({
    queryKey: ['mediaData', userId],
    queryFn: () => fetchMediaData(accessToken, audioList, videoList),
    enabled: !!accessToken && !!userId,
  });
};
