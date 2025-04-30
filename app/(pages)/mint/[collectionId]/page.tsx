'use client';

import { useUser } from '@/lib/UserContext';
import { useEffect, useState, useCallback } from 'react';
import { ParsedUrlQuery } from 'querystring';
import CollectionDetails from '@/components/mint/CollectionDetails';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Params extends ParsedUrlQuery {
  collectionId: string;
  templateId: string;
}

interface Props {
  params: Promise<Params>;
}

export default function TemplateDetailsPage({ params }: Props) {
  const { user, accessToken } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nftList, setNftList] = useState<any[]>([]);

  const fetchNFTList = useCallback(
    async (collectionId: string, userId: string, token: string) => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getNFTListByCollectionAndUser`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId,
              collectionId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            `Server responded with ${response.status}: ${response.statusText}`
          );
        }

        const { data } = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching NFT list:', error);
        throw error;
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!accessToken || !user?._id) {
        const tokenTimeout = setTimeout(() => {
          if (isMounted && !accessToken) {
            setError('Authentication required. Please log in.');
            setLoading(false);
          }
        }, 5000);

        return () => clearTimeout(tokenTimeout);
      }

      try {
        const resolvedParams = await params;
        const data = await fetchNFTList(
          resolvedParams.collectionId,
          user._id,
          accessToken
        );

        if (isMounted) {
          setNftList(data);
        }
      } catch (error) {
        if (isMounted) {
          setError('Failed to load NFT list. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [accessToken, user, params, fetchNFTList]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/mint"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </div>
      {nftList && nftList.length > 0 ? (
        <CollectionDetails templateDetails={nftList} />
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-600 text-lg">No NFTs found</p>
        </div>
      )}
    </div>
  );
}

const LoadingSkeleton = () => {
  return (
    <div className="main-container bg-white p-10 ">
      <div className="">
        <Skeleton className="h-10 w-40" />
        <div className="my-5 flex gap-2">
          <Skeleton className="h-20 w-40" />
          <Skeleton className="h-20 w-40" />
        </div>
        <div className="my-5 flex gap-2">
          <Skeleton className="h-60 w-80" />
          <Skeleton className="h-60 w-80" />
        </div>
      </div>
    </div>
  );
};
