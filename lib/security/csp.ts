export function getSocketConnectSources(origin?: string | null): string[] {
  if (!origin) return [];

  if (origin.startsWith("https://")) {
    return [origin, origin.replace(/^https:\/\//, "wss://")];
  }

  if (origin.startsWith("http://")) {
    return [origin, origin.replace(/^http:\/\//, "ws://")];
  }

  return [origin];
}
