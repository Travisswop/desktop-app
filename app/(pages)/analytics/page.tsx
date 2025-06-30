import { getMicrositeViewer } from "@/actions/micrositeViewer";
import AnalyticsView from "@/components/analytics/AnalyticsView";

const page = async () => {
  const viewersData = await getMicrositeViewer();

  return (
    <div>
      <AnalyticsView viewersData={viewersData?.data} />
    </div>
  );
};

export default page;
