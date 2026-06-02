import dynamic from 'next/dynamic';

const WalletContent = dynamic(
  () => import('@/components/wallet/WalletContent'),
  {
    loading: () => <WalletLoadingShell />,
  },
);

function WalletLoadingShell() {
  return (
    <div className="w-full">
      <div className="max-w-[855px] w-full mx-auto pb-8">
        <div className="my-4 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
          <div className="h-3 w-20 rounded-full bg-gray-200" />
          <div className="mt-4 h-10 w-48 rounded-xl bg-gray-200" />
          <div className="mt-8 h-32 rounded-2xl bg-gray-100" />
        </div>
        <div className="mt-8 grid gap-4">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-black/[0.06] bg-white p-5"
            >
              <div className="h-5 w-32 rounded-full bg-gray-200" />
              <div className="mt-4 h-16 rounded-xl bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const Wallet: React.FC = () => {
  return <WalletContent />;
};

export default Wallet;
