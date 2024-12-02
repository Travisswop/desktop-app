'use client';

import { getTemplateDetails } from "@/utils/fetchingData/getTemplateDetails";
import MintDetails from "@/components/MintDetails";
import { useUser } from '@/lib/UserContext';
import { useEffect, useState } from "react";
import { ParsedUrlQuery } from "querystring";

interface Params extends ParsedUrlQuery {
  collectionId: string;
  templateId: string;
}

interface Props {
  params: Promise<Params>;
}

export default function TemplateDetailsPage({ params }: Props) {
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const { accessToken } = useUser(); // Access context value
  const [templateDetails, setTemplateDetails] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [waitForToken, setWaitForToken] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setWaitForToken(false);
    }, 30000); // 30 seconds

    // Cleanup function to clear the timeout if the component unmounts
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const fetchParams = async () => {
      try {
        const resolvedParams = await params;
        setCollectionId(resolvedParams.collectionId);
        setTemplateId(resolvedParams.templateId);
      } catch (err) {
        console.error("Error resolving params:", err);
        setError("Error resolving route parameters.");
        setLoading(false);
      }
    };

    fetchParams();
  }, [params]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (accessToken && collectionId && templateId) {
        try {
          const details = await getTemplateDetails(collectionId, templateId, accessToken);
          setTemplateDetails(details);
        } catch (err) {
          console.error("Error fetching template details:", err);
          setError("Error fetching template details.");
        } finally {
          setLoading(false);
        }
      } else if (!waitForToken) {
        setError("Access token is required to fetch template details.");
        setLoading(false);
      }
    };

    fetchDetails();
  }, [accessToken, waitForToken, collectionId, templateId]);

  if (loading) {
    return <div>Loading template details...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return <MintDetails templateDetails={templateDetails} />;
}
