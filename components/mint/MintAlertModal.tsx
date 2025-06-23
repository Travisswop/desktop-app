'use client';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Modal, ModalBody, ModalContent } from '@nextui-org/react';

export interface ModelInfo {
  success: boolean;
  nftType: string;
  details?: string;
}

interface MintAlertModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  modelInfo: ModelInfo;
}

export default function MintAlertModal({
  isOpen,
  onOpenChange,
  modelInfo,
}: MintAlertModalProps) {
  // Define animation sources
  const successAnimation =
    'https://lottie.host/926dc1d9-2fe0-4390-9b62-71367a6c630c/ca2wbDok85.lottie';
  const errorAnimation =
    'https://lottie.host/7a1f1050-0701-4d58-b8fb-41dae625a805/cuBznr3T9t.lottie';

  return (
    <Modal
      size="xl"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      backdrop="blur"
      aria-labelledby="mint-result-modal"
    >
      <ModalContent>
        <ModalBody className="text-center py-10">
          <div className="flex flex-col items-center">
            <DotLottieReact
              src={
                modelInfo.success ? successAnimation : errorAnimation
              }
              autoplay
              className="size-36"
              aria-hidden="true"
            />

            {modelInfo.success ? (
              <h2
                id="mint-result-modal"
                className="font-bold text-lg mt-4"
              >
                {modelInfo.nftType.charAt(0).toUpperCase() +
                  modelInfo.nftType.slice(1)}{' '}
                NFT Template Created
              </h2>
            ) : (
              <div className="mt-4">
                <h2
                  id="mint-result-modal"
                  className="font-bold text-lg"
                >
                  Failed to create NFT template
                </h2>
                {modelInfo.details && (
                  <p className="text-lg mt-2" role="alert">
                    {modelInfo.details}
                  </p>
                )}
              </div>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
