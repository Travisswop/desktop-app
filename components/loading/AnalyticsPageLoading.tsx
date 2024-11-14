import React from 'react';
import { Card, Skeleton } from '@nextui-org/react';

const AnalyticsPageLoading = () => {
  return (
    <Card className='h-screen shadow-none rounded-none m-8 overflow-hidden bg-transparent'>
      <div className='grid grid-cols-2 items-center w-full gap-6'>
        {[1, 2, 3, 4]?.map((el: any, index: number) => (
          <Skeleton key={index} className='rounded-lg w-full h-[500px]' />
        ))}
      </div>
    </Card>
  );
};

export default AnalyticsPageLoading;
