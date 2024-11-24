import { fetchUserInfo } from "@/actions/fetchDesktopUserData";
import { UserData } from "@/types";
import { useQuery } from "@tanstack/react-query";

export const useDesktopUserData = (id: string | undefined) => {
  // const queryClient = useQueryClient();

  // Using `useQuery` to fetch data
  const {
    data: user,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<UserData>({
    queryKey: ["user", id],
    queryFn: () => fetchUserInfo(id!, "123445"),
    enabled: !!id, // Only fetch if email is provided
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  // Prefetch user data (optional, for optimization)
  // const prefetchUserData = () => {
  //   queryClient.prefetchQuery(["user", id]);
  // };

  return {
    user,
    error,
    isLoading,
    isFetching,
    refetch,
    //   prefetchUserData,
  };
};
