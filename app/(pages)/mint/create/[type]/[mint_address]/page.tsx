import CreateCollectible from '@/components/mint/collectible';

const CreateCollectiblePage = async ({
  params,
}: {
  params: Promise<{ type: string; mint_address: string }>;
}) => {
  const collection = await params;
  const collectionType = collection.type;
  const collectionId = collection.mint_address;
  if (collectionType === 'collectible') {
    return <CreateCollectible collectionId={collectionId} />;
  }
  return (
    <>
      Hello {collectionType} {collectionId}
    </>
  );
};

export default CreateCollectiblePage;
