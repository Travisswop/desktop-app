import { createMicrositeViewer } from "@/actions/micrositeViewer";
import Custom404 from "./404";
import ClientProfile from "./ClientProfile";
import { addSwopPoint } from "@/actions/addPoint";
import { getDeviceInfo } from "@/components/collectiVistUserInfo";
import { cookies } from "next/headers";
import { getUserData } from "@/actions/user";
import { Metadata } from "next";
import isUrl from "@/lib/isUrl";

const deviceInfo = getDeviceInfo();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  try {
    const userName = (await params)?.username;
    const { data } = await getUserData(userName);

    const microsite = data?.microsite;
    const profileImage = microsite?.profilePic || microsite?.image || "";
    const bio = microsite?.bio || microsite?.description || "";
    const displayName = microsite?.name || userName;
    const pageUrl = `https://www.swopme.app/sp/${userName}`; // 🔁 replace with your domain

    const profileImageUrl = profileImage
      ? isUrl(profileImage)
        ? profileImage
        : `${process.env.NEXT_PUBLIC_APP_URL}/images/user_avator/${profileImage}@3x.png`
      : null;

    return {
      title: `${displayName} | Swop`,
      description: bio,
      openGraph: {
        title: `${displayName} | Swop`,
        description: bio,
        url: pageUrl,
        siteName: "Swop",
        images: profileImageUrl
          ? [
              {
                url: profileImageUrl,
                width: 400,
                height: 400,
                alt: `${displayName}'s profile photo`,
              },
            ]
          : [],
        type: "profile",
      },
      twitter: {
        card: "summary",
        title: `${displayName} | Swop`,
        description: bio,
        images: profileImageUrl ? [profileImageUrl] : [], // ✅ now uses resolved URL too
      },
    };
  } catch {
    return {
      title: "Profile | Swop",
      description: "View this SmartSite profile on Swop.",
    };
  }
}

export default async function PublicProfile({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  try {
    const cookieStore = cookies();
    const viewerId = (await cookieStore).get("user-id")?.value;
    const userName = (await params)?.username;

    const res = await fetch("https://ipinfo.io/json");
    const locationData = await res.json();

    // Get microsite data for analytics
    const { data } = await getUserData(userName);

    console.log("data user", data);

    // Handle analytics on server side
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

    return <ClientProfile userName={userName} />;
  } catch (error) {
    console.error("Error fetching data:", error);
    return <Custom404 />;
  }
}
