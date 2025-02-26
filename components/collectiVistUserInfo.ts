export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();
  const language = navigator.language;

  // Detect OS
  let os = "Unknown OS";
  if (platform.includes("win")) os = "Windows";
  else if (platform.includes("mac")) os = "macOS";
  else if (platform.includes("linux")) os = "Linux";
  else if (userAgent.includes("android")) os = "Android";
  else if (userAgent.includes("iphone") || userAgent.includes("ipad"))
    os = "iOS";

  // Detect Browser
  let browser = "Unknown Browser";
  if (userAgent.includes("chrome") && !userAgent.includes("edg"))
    browser = "Chrome";
  else if (userAgent.includes("safari") && !userAgent.includes("chrome"))
    browser = "Safari";
  else if (userAgent.includes("firefox")) browser = "Firefox";
  else if (userAgent.includes("edg")) browser = "Edge";
  else if (userAgent.includes("opera") || userAgent.includes("opr"))
    browser = "Opera";

  // Detect Device Type
  let deviceType = "Desktop";
  if (userAgent.includes("mobile")) deviceType = "Mobile";
  else if (userAgent.includes("tablet") || userAgent.includes("ipad"))
    deviceType = "Tablet";

  return {
    os,
    browser,
    deviceType,
    userAgent,
    platform,
    language,
  };
};
