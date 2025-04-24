'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ErrorDisplayProps } from './types';

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => (
  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-md mb-4">
    <AlertCircle className="h-5 w-5" />
    <span>{error}</span>
  </div>
);

export default ErrorDisplay;
