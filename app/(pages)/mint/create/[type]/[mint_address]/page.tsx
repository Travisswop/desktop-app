import CreateCollectible from '@/components/mint/collectible';
import CreateCoupon from '@/components/mint/coupon';
import CreateMembership from '@/components/mint/membership';
import CreateMenu from '@/components/mint/menu';
import CreatePhygital from '@/components/mint/phygital';
import CreateSubscription from '@/components/mint/subscription';

const COLLECTION_COMPONENTS = {
  collectible: CreateCollectible,
  coupon: CreateCoupon,
  membership: CreateMembership,
  menu: CreateMenu,
  phygital: CreatePhygital,
  subscription: CreateSubscription,
};

interface Props {
  params: Promise<{ type: string; mint_address: string }>;
}

const CreateNFTTemplatePage = async ({ params }: Props) => {
  const { type, mint_address } = await params;

  const Component =
    COLLECTION_COMPONENTS[type as keyof typeof COLLECTION_COMPONENTS];
  return Component ? (
    <Component collectionId={mint_address} />
  ) : (
    <></>
  );
};

export default CreateNFTTemplatePage;
