import { getTemplateDetails } from "@/utils/fetchingData/getTemplateDetails";
import MintDetails from "@/components/MintDetails";

// This is a server component
export default async function TemplateDetailsPage({
  params,
}: {
  params: Promise<{ collectionId: string; templateId: string }>;
}) {
  // Await the params object
  const { collectionId, templateId } = await params;

  // Use a demo access token directly
  const accessToken = "your_demo_access_token_here";

  // Fetch the template details using the access token
  const templateDetails = await getTemplateDetails(
    collectionId,
    templateId,
    accessToken
  );

  if (!templateDetails) {
    return <div>Error loading template details</div>;
  }

  // Pass the fetched data as props to the client component
  return <MintDetails templateDetails={templateDetails} />;
}
