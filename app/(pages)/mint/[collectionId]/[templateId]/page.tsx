'use client';

import { getTemplateDetails } from "@/utils/fetchingData/getTemplateDetails";
import MintDetails from "@/components/MintDetails";
import { useUser } from '@/lib/UserContext';
import { useEffect, useState } from "react";

export default function TemplateDetailsPage({
  params,
}: {
  params: { collectionId: string; templateId: string };
}) {
  const { collectionId, templateId } = params;
  const { accessToken } = useUser(); // Access context value
  const [templateDetails, setTemplateDetails] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setError("Access token is required to fetch template details.");
      return;
    }

    const fetchDetails = async () => {
      try {
        const details = await getTemplateDetails(
          collectionId,
          templateId,
          accessToken
        );
        setTemplateDetails(details);
      } catch (err) {
        console.error("Error fetching template details:", err);
        setError("Error fetching template details.");
      }
    };

    fetchDetails();
  }, [collectionId, templateId, accessToken]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!templateDetails) {
    return <div>Loading template details...</div>;
  }

  return <MintDetails templateDetails={templateDetails} />;
}
