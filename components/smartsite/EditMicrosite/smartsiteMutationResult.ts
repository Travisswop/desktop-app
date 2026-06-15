export const isSmartSiteMutationSuccess = (result: unknown) =>
  typeof result === "object" &&
  result !== null &&
  "state" in result &&
  result.state === "success";

export const removePendingSmartSiteIcon = (icons: string[], title: string) =>
  icons.filter((icon) => icon !== title);
