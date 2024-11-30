'use client';
import { useUser } from '@/lib/UserContext';
import MainContent from './mainContent';
import { Card, CardContent } from '@/components/ui/card';

const Content: React.FC = () => {
  const { user, loading, accessToken } = useUser();
  if (loading) {
    <LoadingSkeleton />;
  }

  return (
    <div>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <MainContent id={user?._id} token={accessToken} />
      )}
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="bg-gray-50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="h-10 w-72 bg-gray-200 rounded animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-40 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Content;
