'use client';

import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center py-6">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
  </div>
);

export default LoadingSpinner;
