import { FeedMainComponentLoading } from '@/components/loading/TabSwitcherLoading';

export default function FeedLoading() {
  return (
    <div className="main-container mx-6">
      <div className="bg-white rounded-xl">
        <div className="w-full sm:w-[520px] mx-auto">
          <FeedMainComponentLoading />
        </div>
      </div>
    </div>
  );
}
