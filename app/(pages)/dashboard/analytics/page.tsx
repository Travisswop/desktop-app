import {
  fetchAnalyticsInfo,
  fetchUserInfo,
} from '@/actions/fetchDesktopUserData';
import logger from '@/utils/logger';
import { cookies } from 'next/headers';
import AnalyticsContent from './_components/AnalyticsContent';

// Main Analytics Dashboard Component
export default async function AnalyticsDashboard() {
  // const [isRefreshing, setIsRefreshing] = useState(false);

  const cookieStore = cookies();
  const userId = (await cookieStore).get('user-id')?.value;
  const token = (await cookieStore).get('access-token')?.value;
  // console.log("cookie user id", userId);

  if (userId && token) {
    const analyticsData = await fetchAnalyticsInfo(token);
    const userData = await fetchUserInfo(userId, token);

    return (
      <div className="bg-white p-6 rounded-xl">
        <AnalyticsContent
          userData={userData}
          analyticsData={analyticsData}
        />
      </div>
    );
  } else {
    console.log('userId or token in cookie not found!');
  }
}
