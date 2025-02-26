'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MintCart from '@/components/MintCart';
import Link from 'next/link';
import HomePageLoading from '@/components/loading/HomePageLoading';
import getCollectionData from '@/utils/fetchingData/getCollectionData';
import { useUser } from '@/lib/UserContext';
import { PlusCircle } from 'lucide-react';

interface Collection {
  _id: string;
  name: string;
  mint_address: string;
  image: string;
}

const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

const MintDashboard = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { accessToken } = useUser();

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      setError(new Error('Access token is required.'));
      setLoading(false);
      return;
    }

    try {
      const { data } = await getCollectionData(accessToken);
      setCollections(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error('An unexpected error occurred.')
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      fetchData();
    } else {
      const timeoutId = setTimeout(() => {
        if (!accessToken) {
          setError(new Error('Access token is required.'));
          setLoading(false);
        }
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [accessToken, fetchData]);

  if (loading) {
    return <HomePageLoading />;
  }

  if (error) {
    return (
      <div className="main-container p-4 text-red-600">
        Error loading dashboard: {error.message}
      </div>
    );
  }

  return (
    <main className="main-container">
      <div className="bg-white p-4">
        {collections.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-600">No collections found.</p>
          </div>
        ) : (
          collections.map((collection) => (
            <div key={collection._id} className="mb-8">
              <h3 className="text-xl font-semibold my-2">
                {capitalizeFirstLetter(collection.name)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-10">
                <MintCart
                  img={collection.image}
                  title={collection.name}
                  collectionId={collection._id}
                  description={`A unique digital collectible that represents ownership of exclusive ${collection.name} content. Each piece is verifiably authentic on the blockchain.`}
                />
                <Link
                  className="block h-full"
                  href={`/mint/create/${collection.name}/${collection.mint_address}`}
                >
                  <div className="shadow-medium rounded-lg px-5 py-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 h-full">
                    <PlusCircle className="w-24 h-24 text-gray-400 mb-4 stroke-1" />
                    <p className="text-lg font-semibold text-gray-700">
                      Add NFTs To This Type
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
};

export default MintDashboard;
