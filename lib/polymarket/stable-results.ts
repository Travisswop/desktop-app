export function mergeSettledArrays<T>(
  results: PromiseSettledResult<T[]>[],
  errorMessage: string,
): T[] {
  const fulfilled = results
    .filter(
      (result): result is PromiseFulfilledResult<T[]> =>
        result.status === 'fulfilled',
    )
    .flatMap((result) => result.value);
  const failed = results.some((result) => result.status === 'rejected');

  if (failed && fulfilled.length === 0) {
    throw new Error(errorMessage);
  }

  return fulfilled;
}
