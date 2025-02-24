"use client";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Modal, ModalBody, ModalContent } from "@nextui-org/react";
import { useState } from "react";


export default function MintAlertModal({
  isOpen,
  onOpenChange,
  modelInfo,
}: any) {
  // State to manage copied effect
  const [isCopied, setIsCopied] = useState(false);
  // State to manage notification visibility
  const [showNotification, setShowNotification] = useState(false);

  console.log("check value item", modelInfo);

  return (
    <>
      {isOpen && (
        <>
          <Modal
            size="xl"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop={"blur"}
          >
            <ModalContent>
              <div className="w-[91%] mx-auto py-10">
                <ModalBody className="text-center">
                  <div className="flex justify-center flex-col items-center">
                    <DotLottieReact
                      src={
                        modelInfo?.flag
                          ? "https://lottie.host/926dc1d9-2fe0-4390-9b62-71367a6c630c/ca2wbDok85.lottie"
                          : "https://lottie.host/7a1f1050-0701-4d58-b8fb-41dae625a805/cuBznr3T9t.lottie"
                      }
                      // src="https://lottie.host/926dc1d9-2fe0-4390-9b62-71367a6c630c/ca2wbDok85.lottie"
                      // src="https://lottie.host/7a1f1050-0701-4d58-b8fb-41dae625a805/cuBznr3T9t.lottie"
                      autoplay
                      className="size-36 flex justify-center"
                    />

                    <p className="font-bold text-lg">{modelInfo?.title}</p>
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
