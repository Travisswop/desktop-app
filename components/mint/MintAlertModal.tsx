'use client';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Modal, ModalBody, ModalContent } from '@nextui-org/react';

export default function MintAlertModal({
  isOpen,
  onOpenChange,
  modelInfo,
}: any) {
  return (
    <>
      {isOpen && (
        <>
          <Modal
            size="xl"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop={'blur'}
          >
            <ModalContent>
              <div className="w-[91%] mx-auto py-10">
                <ModalBody className="text-center">
                  <div className="flex justify-center flex-col items-center">
                    <DotLottieReact
                      src={
                        modelInfo.success
                          ? 'https://lottie.host/926dc1d9-2fe0-4390-9b62-71367a6c630c/ca2wbDok85.lottie'
                          : 'https://lottie.host/7a1f1050-0701-4d58-b8fb-41dae625a805/cuBznr3T9t.lottie'
                      }
                      autoplay
                      className="size-36 flex justify-center"
                    />

                    <p className="font-bold text-lg">
                      {modelInfo.message}
                    </p>
                  </div>
                </ModalBody>
              </div>
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
}
