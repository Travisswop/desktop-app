import React from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { AlertCircle } from 'lucide-react';

export const LoadingState: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-pulse space-y-4 w-full max-w-4xl">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
}) => {
  return (
    <div className="flex justify-center items-center h-screen p-4">
      <Card className="max-w-lg w-full bg-red-50 border border-red-200">
        <CardBody className="p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
            <h2 className="text-xl font-semibold text-red-600">
              Error
            </h2>
          </div>
          <p className="text-red-500 mb-4">{error}</p>
          {onRetry && (
            <Button color="danger" variant="flat" onClick={onRetry}>
              Try Again
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

interface NotFoundStateProps {
  orderId: string;
}

export const NotFoundState: React.FC<NotFoundStateProps> = ({
  orderId,
}) => {
  return (
    <div className="flex justify-center items-center h-screen p-4">
      <Card className="max-w-lg w-full">
        <CardBody className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-600">
            No order found with ID: {orderId}
          </p>
        </CardBody>
      </Card>
    </div>
  );
};
