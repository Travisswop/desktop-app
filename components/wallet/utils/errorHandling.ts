import { ERROR_MESSAGES } from '../constants';

export class TransactionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'TransactionError';
  }
}

export const handleTransactionError = (error: unknown): string => {
  if (error instanceof TransactionError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return ERROR_MESSAGES.UNKNOWN_ERROR;
};

export const createErrorToast = (error: unknown) => ({
  variant: 'destructive' as const,
  title: 'Error',
  description: handleTransactionError(error),
});
