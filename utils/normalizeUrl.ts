function normalizeUrl(value: string) {
  if (!value) return "";

  // Trim whitespace
  const url = value.trim();

  // Check for http or https
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }

  return url;
}

export default normalizeUrl;
