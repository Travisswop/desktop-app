export function formatCount(num: number) {
  return Intl.NumberFormat("en", { notation: "compact" }).format(num);
}
