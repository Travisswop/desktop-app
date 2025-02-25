export const getUserLocation = async (): Promise<{
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
}> => {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by your browser.");
  }

  try {
    const { coords } = await new Promise<GeolocationPosition>(
      (resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, (err) =>
          reject(new Error(err.message))
        )
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId); // Clear timeout if request succeeds

    if (!response.ok) {
      throw new Error(
        `Failed to fetch location details: ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      lat: coords.latitude,
      lng: coords.longitude,
      city: data.address?.city || data.address?.town || data.address?.village,
      state: data.address?.state,
      country: data.address?.country,
    };
  } catch (error) {
    console.error("Error fetching user location:", error);
  }
};

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
