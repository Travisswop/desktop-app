import CreateCollectible from '@/components/mint/collectible';
import CreateCoupon from '@/components/mint/coupon';
import CreateMembership from '@/components/mint/membership';
import CreateMenu from '@/components/mint/menu';
import CreatePhygital from '@/components/mint/phygital';
import CreateSubscription from '@/components/mint/subscription';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const COLLECTION_COMPONENTS = {
  collectible: CreateCollectible,
  coupon: CreateCoupon,
  membership: CreateMembership,
  menu: CreateMenu,
  phygitals: CreatePhygital,
  subscription: CreateSubscription,
};

interface Props {
  params: Promise<{ type: string; mint_address: string }>;
}

const CreateNFTTemplatePage = async ({ params }: Props) => {
  const { type, mint_address } = await params;

  const Component =
    COLLECTION_COMPONENTS[type as keyof typeof COLLECTION_COMPONENTS];

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
      {Component ? <Component collectionId={mint_address} /> : <></>}
    </div>
  );
};

export default CreateNFTTemplatePage;
