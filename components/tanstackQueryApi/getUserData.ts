import { fetchUserInfo } from '@/actions/fetchDesktopUserData';
import { UserData } from '@/types';
import { useQuery } from '@tanstack/react-query';

export const useDesktopUserData = (
  _id: string | undefined,
  token: string
) => {
  // const queryClient = useQueryClient();

  // Using `useQuery` to fetch data
  const { data, error, isLoading, isFetching, refetch } =
    useQuery<UserData>({
      queryKey: ['user', _id],
      queryFn: async () => fetchUserInfo(_id!, token),
      enabled: !!_id, // Only fetch if email is provided
      staleTime: 60 * 60 * 1000, // 1 hour
    });

  // Prefetch user data (optional, for optimization)
  // const prefetchUserData = () => {
  //   queryClient.prefetchQuery(["user", id]);
  // };

  return {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
    //   prefetchUserData,
  };
};
