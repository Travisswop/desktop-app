'use client';

import React from 'react';
import Collection from '@/components/mint/Collection';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { MINT_COLLECTIONS } from '@/constants/mintCollections';

const MintDashboard = () => {
  const collections = MINT_COLLECTIONS;

  return (
    <main className="main-container">
      <div className="bg-white p-4">
        {collections.map((item) => (
          <div key={item._id} className="mb-8">
            <h3 className="text-xl font-semibold my-2">
              {item.displayName}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-10">
              <Collection
                img={item.image}
                title={item.displayName}
                collectionId={item._id}
                description={item.description}
              />
              <Link
                className="block h-full"
                href={`/mint/create/${item.displayName.toLowerCase()}/${
                  item.address
                }`}
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
        ))}
      </div>
    </main>
  );
};

export default MintDashboard;
