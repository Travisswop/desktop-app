import WalletContent from '@/components/wallet/WalletContent';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 60 * 1000, // 1 hour
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const Wallet: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletContent />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default Wallet;
