export function toFixedTruncate(num: number, decimals: number) {
  const factor = Math.pow(10, decimals);
  return (Math.trunc(num * factor) / factor).toFixed(decimals);
}
