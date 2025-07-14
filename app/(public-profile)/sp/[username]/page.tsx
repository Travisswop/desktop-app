import { createMicrositeViewer } from '@/actions/micrositeViewer';
import Custom404 from './404';
import ClientProfile from './ClientProfile';
import { addSwopPoint } from '@/actions/addPoint';
import { getDeviceInfo } from '@/components/collectiVistUserInfo';
import { cookies } from 'next/headers';
import { getUserData } from '@/actions/user';

const deviceInfo = getDeviceInfo();

export default async function PublicProfile({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  try {
    const cookieStore = cookies();
    const viewerId = (await cookieStore).get('user-id')?.value;
    const userName = (await params)?.username;

    const res = await fetch('https://ipinfo.io/json');
    const locationData = await res.json();

    // Get microsite data for analytics
    const { data } = await getUserData(userName);

    // Handle analytics on server side
    await addSwopPoint({
      userId: data.microsite.parentId,
      pointType: 'Generating Traffic to Your SmartSite',
      actionKey: 'launch-swop',
    });

    createMicrositeViewer({
      userId: data.microsite.parentId,
      viewerId: viewerId ? viewerId : 'anonymous',
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
    console.error('Error fetching data:', error);
    return <Custom404 />;
  }
}
