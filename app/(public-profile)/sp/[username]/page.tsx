import { createMicrositeViewer } from "@/actions/micrositeViewer";
import Custom404 from "./404";
import ClientProfile from "./ClientProfile";
// import { Metadata, ResolvingMetadata } from "next";
import { addSwopPoint } from "@/actions/addPoint";
import { getUserData } from "@/actions/user";
import { getDeviceInfo } from "@/components/collectiVistUserInfo";
import { cookies } from "next/headers";

const deviceInfo = getDeviceInfo();

export default async function PublicProfile({
  params,
}: {
  // params: { username: string };
  params: Promise<{ username: string }>;
}) {
  try {
    const cookieStore = cookies();
    const viewerId = (await cookieStore).get("user-id")?.value;

    const res = await fetch("https://ipinfo.io/json");
    const locationData = await res.json();

    const userName = (await params)?.username;

    const { data } = await getUserData(userName);

    console.log("datadd", data);

    await addSwopPoint({
      userId: data.microsite.parentId,
      pointType: "Generating Traffic to Your SmartSite",
      actionKey: "launch-swop",
    });

    createMicrositeViewer({
      userId: data.microsite.parentId,
      viewerId: viewerId ? viewerId : "anonymous",
      micrositeName: userName,
      city: locationData?.city,
      region: locationData?.region,
      country: locationData?.country,
      device: deviceInfo?.deviceType,
      deviceOs: deviceInfo?.os,
      deviceBrowser: deviceInfo?.browser,
    });

    // If no redirect is needed, render the ClientProfile
    return <ClientProfile initialData={data.microsite} userName={userName} />;
  } catch (error) {
    console.error("Error fetching data:", error);
    return <Custom404 />;
  }
}
