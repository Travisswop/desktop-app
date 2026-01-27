interface ErrorStateProps {
  error: Error | unknown;
  title?: string;
}

export default function ErrorState({
  error,
  title = 'Error',
}: ErrorStateProps) {
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred';

  return (
    <div className="bg-red-50 rounded-lg p-6 border border-red-200">
      <h3 className="text-red-700 font-semibold mb-2">{title}</h3>
      <p className="text-red-600 text-sm">{errorMessage}</p>
    </div>
  );
}
