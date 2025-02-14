'use client';

import { getTemplateDetails } from '@/utils/fetchingData/getTemplateDetails';
import MintDetails from '@/components/MintDetails';
import { useUser } from '@/lib/UserContext';
import { useEffect, useState } from 'react';
import { ParsedUrlQuery } from 'querystring';

interface Params extends ParsedUrlQuery {
  collectionId: string;
  templateId: string;
}

interface Props {
  params: Promise<Params>;
}

export default function TemplateDetailsPage({ params }: Props) {
  const [collectionId, setCollectionId] = useState<string | null>(
    null
  );
  const [templateId, setTemplateId] = useState<string | null>(null);
  const { user, accessToken } = useUser(); // Access context value
  console.log('🚀 ~ TemplateDetailsPage ~ accessToken:', accessToken);
  const [templateDetails, setTemplateDetails] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [waitForToken, setWaitForToken] = useState(true);
  const [loading, setLoading] = useState(true);
  const [nftList, setNftList] = useState([]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setWaitForToken(false);
    }, 30000); // 30 seconds

    // Cleanup function to clear the timeout if the component unmounts
    return () => clearTimeout(timeoutId);
  }, []);

  // useEffect(() => {
  //   const fetchParams = async () => {
  //     try {
  //       const resolvedParams = await params;
  //       setCollectionId(resolvedParams.collectionId);
  //       setTemplateId(resolvedParams.templateId);
  //     } catch (err) {
  //       console.error('Error resolving params:', err);
  //       setError('Error resolving route parameters.');
  //       setLoading(false);
  //     }
  //   };

  //   fetchParams();
  // }, [params]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (accessToken) {
        // try {
        //   const details = await getTemplateDetails(collectionId, templateId, accessToken);
        //   setTemplateDetails(details);
        // } catch (err) {
        //   console.error("Error fetching template details:", err);
        //   setError("Error fetching template details.");
        // } finally {
        //   setLoading(false);
        // }

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getNFTListByCollectionAndUser`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                userId: user._id,
                collectionId: (await params).collectionId,
              }),
            }
          );
          if (!response.ok) {
            throw new Error('Something went wrong');
          }
          const { data } = await response.json();
          console.log('data from action', data);
          setNftList(data);
        } catch (error) {
          console.error('Error from posting feed:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDetails();
  }, [accessToken, collectionId, templateId]);

  if (loading) {
    return <div>Loading template details...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      {nftList && nftList.length > 0 ? (
        <MintDetails templateDetails={nftList} />
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-600 text-lg">No NFTs found</p>
        </div>
      )}
    </div>
  );
}
