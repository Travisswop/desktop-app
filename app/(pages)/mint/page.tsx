'use client';

import React, { useState, useEffect } from 'react';
import MintCart from '@/components/MintCart';
import Link from 'next/link';
import PushToMintCollectionButton from '@/components/Button/PushToMintCollectionButton';
import SaveToLocalAndNavigate from '@/components/SaveToLocalAndNavigate';
import HomePageLoading from '@/components/loading/HomePageLoading';
import getMintPageData from '@/utils/fetchingData/getMintPageData';
import { useUser } from '@/lib/UserContext';

interface Template {
  templateId: string;
  metadata: {
    image: string;
    name: string;
    description: string;
  };
  supply: {
    limit: number;
    minted: number;
  };
}

interface Collection {
  _id: string;
  name: string;
  mint_address: string;
  image: string;
}

const nftTypes = [
  'collectible',
  'subscription',
  'membership',
  'coupon',
  'menu',
  'phygital',
];

const nftCollection = [
  {
    name: 'collectible',
    mint_address: 'Tf39QyKnuY99j1pUoNrEyAcBAxSmoogYSmuRiSAfhjg',
    image:
      'https://quicknode.quicknode-ipfs.com/ipfs/QmPrxJi3rVPQZVqLnEfTEx1Urb9FKbGSk1J2HYrLqnyZyn',
  },
  {
    name: 'subscription',
    mint_address: '8ngpZFQaARzprfJewfdTJJqs1MP6rE4xc1tpwbntADFp',
    image:
      'https://quicknode.quicknode-ipfs.com/ipfs/QmSvPHcb7T2AVd8ebaYgKfRBwDXNwzTHUJ7D19LRmaRHia',
  },
  {
    name: 'membership',
    mint_address: 'CszXhmv3c36NmNxKRfYsttWE3DTA32krStf3rqpyaidq',
    image:
      'https://quicknode.quicknode-ipfs.com/ipfs/QmSdMaGMHjKvjNxLyta33MU5NzKLJEUQb82we2JjtRjwU7',
  },
  {
    name: 'coupon',
    mint_address: 'FyaZ99koNBLavhTEFkHCYbXECFfvwN3iBcDsBAkGa2LM',
    image:
      'https://quicknode.quicknode-ipfs.com/ipfs/QmbyMj44c159eBx5wmAJuDVb7DoDuBjr9N6dsx7CgopwwA',
  },
  {
    name: 'menu',
    mint_address: '6upDsvqvX87Hzr5zYL87BED7U998S3WgHNcdBC9zwznn',
    image:
      'https://quicknode.quicknode-ipfs.com/ipfs/QmdSukD82bzFnxAwWunpKdzHmm8zpXSv9sbRAWR1xgLcVm',
  },
  {
    name: 'phygital',
    mint_address: '23WshXUoW2Mi38E3XFL8NeqcKZ4PXpN1PTKBGJzZzu4q',
    image:
      'https://quicknode.quicknode-ipfs.com/ipfs/QmSEdUJoU9L2vkKCpvMTjkL8yhsXKPJqdaUg62wxaK9AqG',
  },
];

const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

const MintDashboard = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { accessToken } = useUser();
  const [waitForToken, setWaitForToken] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setWaitForToken(false);
    }, 30000); // 30 seconds

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (accessToken) {
        try {
          const { data } = await getMintPageData(accessToken);
          setCollections(data);
        } catch (err) {
          if (err instanceof Error) {
            setError(err);
          } else {
            setError(new Error('An unexpected error occurred.'));
          }
        } finally {
          setLoading(false);
        }
      } else if (!waitForToken) {
        setError(new Error('Access token is required.'));
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken, waitForToken]);

  if (loading) {
    return <HomePageLoading />;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }

  const staticSamples = nftCollection.map((nftType) => ({
    nftType: nftType.name,
    templateId: `${nftType.mint_address}`,
    metadata: {
      image: `/assets/collections/${nftType.name}.png`, // Replace with your sample images
      name: `${capitalizeFirstLetter(nftType.name)}`,
      description: `A unique digital collectible that represents ownership of exclusive ${nftType} content. Each piece is verifiably authentic on the blockchain.`,
    },
    supply: {
      limit: 100,
      minted: 0,
    },
  }));

  console.log('collections', collections);

  // if (!mintData || ("noCollections" in mintData && mintData.noCollections)) {
  //   const staticSamples = nftCollection.map((nftType) => ({
  //     nftType: nftType.name,
  //     templates: [
  //       {
  //         templateId: `${nftType.mint_address}`,
  //         metadata: {
  //           image: `/assets/collections/${nftType.name}.png`, // Replace with your sample images
  //           name: `${capitalizeFirstLetter(nftType.name)}`,
  //           description: `A unique digital collectible that represents ownership of exclusive ${nftType} content. Each piece is verifiably authentic on the blockchain.`,
  //         },
  //         supply: {
  //           limit: 100,
  //           minted: 0,
  //         },
  //       },
  //     ],
  //   }));

  //   return (
  //     <main className="main-container">
  //       <div className="bg-white p-4">
  //         <h2 className="text-center text-2xl font-bold mb-6">
  //           Explore NFT Types
  //         </h2>
  //         {staticSamples.map((sampleGroup) => (
  //           <div key={sampleGroup.nftType}>
  //             <h3 className="text-xl font-semibold my-2">
  //               {capitalizeFirstLetter(sampleGroup.nftType)}
  //             </h3>
  //             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 xl:gap-10">
  //               {sampleGroup.templates.map((template) => (
  //                 <MintCart
  //                 key={template.templateId}
  //                 img={template.metadata.image}
  //                 title={template.metadata.name}
  //                 text={`Limit: ${template.supply.limit}, Minted: ${template.supply.minted}`}
  //                 collectionId={group.collection.id}
  //                 templateId={template.templateId}
  //                 description={template.metadata.description}
  //                 />
  //               ))}
  //               <div
  //                 className="min-h-[360px] min-w-[365px] h-full w-full"
  //                 onClick={() =>
  //                   (window.location.href = `/mint/create${capitalizeFirstLetter(
  //                     sampleGroup.nftType
  //                   )}`)
  //                 }
  //               >
  //                 <SaveToLocalAndNavigate collectionId="static-sample" />
  //               </div>
  //             </div>
  //           </div>
  //         ))}
  //         {/* <div className="flex justify-center mt-8">
  //           <Link href="/mint/createCollection">
  //             <PushToMintCollectionButton className="!py-2">
  //               Create Collection
  //             </PushToMintCollectionButton>
  //           </Link>
  //         </div> */}
  //       </div>
  //     </main>
  //   );
  // }

  return (
    <main className="main-container">
      <div className="bg-white p-4">
        {collections.length > 0 &&
          collections.map((collection) => (
            <div key={collection._id}>
              <h3 className="text-xl font-semibold my-2">
                {capitalizeFirstLetter(collection.name)}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 xl:gap-10">
                <MintCart
                  key={collection._id}
                  img={collection.image}
                  title={collection.name}
                  collectionId={collection.mint_address}
                  description={`A unique digital collectible that represents ownership of exclusive ${collection.name} content. Each piece is verifiably authentic on the blockchain.`}
                />
                <div
                  className="min-h-[360px] min-w-[365px] h-full w-full"
                  onClick={() =>
                    (window.location.href = `/mint/create${capitalizeFirstLetter(
                      collection.name
                    )}`)
                  }
                >
                  <SaveToLocalAndNavigate
                    collectionId={collection.mint_address}
                  />
                </div>
              </div>
            </div>
          ))}

        {/* <div className="flex justify-center mt-8">
          <Link href="/mint/createCollection">
            <PushToMintCollectionButton className="!py-2">
              Create Collection
            </PushToMintCollectionButton>
          </Link>
        </div> */}
      </div>
    </main>
  );
};

export default MintDashboard;
