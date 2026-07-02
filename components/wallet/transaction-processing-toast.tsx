'use client';

import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';

type TransactionToastState = 'loading' | 'success' | 'error';

type TransactionToastContentProps = {
  title: string;
  message: string;
  explorerUrl?: string | null;
  explorerLabel?: string;
  state: TransactionToastState;
};

type TransactionToastOptions = {
  id?: string;
  title: string;
  message: string;
  explorerUrl?: string | null;
  explorerLabel?: string;
};

const stateIcon = {
  loading: <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-[#3fe08f]" />,
  success: <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#3fe08f]" />,
  error: <AlertCircle className="mt-0.5 h-4 w-4 text-[#ff5a5f]" />,
};

function TransactionToastContent({
  title,
  message,
  explorerUrl,
  explorerLabel = 'View transaction',
  state,
}: TransactionToastContentProps) {
  return (
    <div className="flex max-w-[360px] gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
        {stateIcon[state]}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold leading-5 text-white">
          {title}
        </p>
        <p className="text-xs leading-5 text-white/70">{message}</p>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#3fe08f]"
          >
            {explorerLabel}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export function showTransactionProcessingToast({
  id,
  title,
  message,
  explorerUrl,
  explorerLabel,
}: TransactionToastOptions) {
  return toast.loading(
    <TransactionToastContent
      title={title}
      message={message}
      explorerUrl={explorerUrl}
      explorerLabel={explorerLabel}
      state="loading"
    />,
    {
      id,
      icon: null,
      duration: Infinity,
    },
  );
}

export function showTransactionSuccessToast({
  id,
  title,
  message,
  explorerUrl,
  explorerLabel,
}: TransactionToastOptions) {
  return toast.success(
    <TransactionToastContent
      title={title}
      message={message}
      explorerUrl={explorerUrl}
      explorerLabel={explorerLabel}
      state="success"
    />,
    {
      id,
      icon: null,
      duration: 9000,
    },
  );
}

export function showTransactionErrorToast({
  id,
  title,
  message,
  explorerUrl,
  explorerLabel,
}: TransactionToastOptions) {
  return toast.error(
    <TransactionToastContent
      title={title}
      message={message}
      explorerUrl={explorerUrl}
      explorerLabel={explorerLabel}
      state="error"
    />,
    {
      id,
      icon: null,
      duration: 10000,
    },
  );
}
