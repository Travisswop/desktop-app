'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="container">
      <div className="flex max-w-md mx-auto min-h-screen flex-col items-center justify-center text-gray-700">
        <div>
          <h1>Something went wrong!</h1>
          <div>
            <button
              className=" bg-amber-400 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded"
              onClick={
                // Attempt to recover by trying to re-render the segment
                () => reset()
              }
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
