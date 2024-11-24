"use client";
import React, { useState } from "react";
import { Modal, ModalContent, ModalBody } from "@nextui-org/react";
import Image from "next/image";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";

export default function SelectBackgroudOrBannerModal({
  isOpen,
  onOpenChange,
  bannerImgArr,
  backgroundImgArr,
  setIsBannerModalOpen,
}: any) {
  const [isBannerImg, setIsBannerImg] = useState(true);

  const { setFormData }: any = useSmartsiteFormStore();

  const selectBanner = (image: any) => {
    isOpen = false;
    // setBackgroundImage({
    //   background: "",
    //   banner: image,
    // });
    setIsBannerModalOpen(false);
    setFormData("backgroundImg", image);
    setFormData("theme", false);
    // setIsModalOpen(false);
  };

  const selectBackground = (image: any) => {
    isOpen = false;
    // setBackgroundImage({
    //   background: image,
    //   banner: "",
    // });
    setIsBannerModalOpen(false);
    setFormData("backgroundImg", image);
    setFormData("theme", true);
  };

  return (
    <>
      {isOpen && (
        <>
          <Modal
            size="5xl"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop={"blur"}
            scrollBehavior={"outside"}
            className="overflow-auto"
          >
            <ModalContent className="">
              <div className="w-[91%] mx-auto py-6">
                <ModalBody className="text-center">
                  <div>
                    <div className="flex justify-center gap-3">
                      <button
                        className={`${
                          !isBannerImg
                            ? "text-gray-700 font-medium underline underline-offset-4"
                            : "text-gray-400 font-medium"
                        }`}
                        onClick={() => setIsBannerImg(false)}
                      >
                        Banner
                      </button>
                      <button
                        className={`${
                          isBannerImg
                            ? "text-gray-700 font-medium underline underline-offset-4"
                            : "text-gray-400 font-medium"
                        }`}
                        onClick={() => setIsBannerImg(true)}
                      >
                        Background
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 my-3 font-medium">
                      Select from our wide variety of links and contact info
                      below.
                    </p>
                  </div>
                  {!isBannerImg ? (
                    <div className="grid grid-cols-4 gap-3">
                      {bannerImgArr.map((image: string, index: number) => (
                        <div key={index}>
                          <Image
                            src={`/images/smartsite-banner/${image}.png`}
                            alt="avator"
                            width={663}
                            height={324}
                            className="cursor-pointer w-full h-auto rounded-lg"
                            placeholder="blur"
                            blurDataURL="/images/smartsite-banner/placeholder.svg"
                            onClick={() => selectBanner(image)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid  grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {backgroundImgArr.map((image: string, index: number) => (
                        <div key={index}>
                          <Image
                            src={`/images/smartsite-background/${image}.png`}
                            alt="avator"
                            width={600}
                            height={1215}
                            className="cursor-pointer w-full h-auto rounded-lg"
                            placeholder="blur"
                            blurDataURL="/images/smartsite-background/transparent-bg.png"
                            onClick={() => selectBackground(image)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </ModalBody>
              </div>
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
}
