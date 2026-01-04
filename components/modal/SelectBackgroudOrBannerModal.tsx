"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
import CustomModal from "./CustomModal";
import { PrimaryButton } from "../ui/Button/PrimaryButton";
import { MdOutlineColorLens } from "react-icons/md";
import { HexAlphaColorPicker } from "react-colorful";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "../ui/carousel";

export default function SelectBackgroudOrBannerModal({
  isOpen,
  onOpenChange,
  backgroundImgArr,
  setIsBannerModalOpen,
}: any) {
  const [isBackgroundColor, setIsBackgroundColor] = useState(false);
  const [color, setColor] = useState("#fee1e1ff");
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const { setFormData }: any = useSmartsiteFormStore();

  console.log("current", current);

  useEffect(() => {
    if (!api) {
      return;
    }
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handleClose = () => {
    setIsBannerModalOpen(false);
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleChooseBgAndColor = (e: any) => {
    e.preventDefault();
    if (isBackgroundColor) {
      setFormData("backgroundColor", color);
      setFormData("backgroundImg", "");
    } else {
      setFormData("backgroundImg", current + 1);
      setFormData("backgroundColor", "");
    }
    setIsBannerModalOpen(false);
  };

  return (
    <CustomModal isOpen={isOpen} onCloseModal={handleClose} width="max-w-md">
      <div className="w-[91%] mx-auto pb-6">
        <p className={`text-center font-medium text-lg mb-3`}>
          {!isBackgroundColor ? "Background" : "Background Color"}
        </p>

        {isBackgroundColor ? (
          <div className="flex justify-center py-12">
            <div className="w-[300px] rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 p-4 shadow-xl">
              <div className="rounded-xl overflow-hidden">
                <HexAlphaColorPicker
                  className="min-w-full min-h-64"
                  color={color}
                  onChange={setColor}
                />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-full border border-slate-600"
                  style={{ backgroundColor: color }}
                />
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative py-8 overflow-hidden">
            <Carousel
              setApi={setApi}
              opts={{
                align: "center",
                loop: true,
              }}
              className="w-full mx-auto overflow-hidden"
            >
              <CarouselContent className="-ml-2 md:-ml-2">
                {backgroundImgArr.map((image: string, index: number) => (
                  <CarouselItem
                    key={index}
                    className="pl-2 md:pl-4 basis-3/4 md:basis-2/3"
                  >
                    <div
                      className={`relative group transition-all duration-500 ${
                        current === index ? "scale-100 z-10" : "scale-90"
                      }`}
                      // onClick={() => selectBackground(image)}
                    >
                      <Image
                        src={`/images/smartsite-background/${image}.png`}
                        alt="background"
                        width={600}
                        height={900}
                        quality={100}
                        className="w-full h-auto rounded-3xl object-cover aspect-[3/4]"
                        placeholder="blur"
                        blurDataURL="/images/smartsite-background/transparent-bg.png"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-3xl transition-colors duration-300" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {/* Dots Indicator */}
            <div className="flex justify-center items-center gap-1.5 h-10">
              {backgroundImgArr.map((_: any, index: number) => (
                <div
                  key={index}
                  className={`rounded-full transition-all duration-300 ${
                    current === index
                      ? "w-2 h-2 bg-gray-800"
                      : "w-1.5 h-1.5 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="w-full flex flex-col items-center gap-3 mt-5">
          {isBackgroundColor ? (
            <PrimaryButton
              onClick={() => setIsBackgroundColor(false)}
              className="w-full bg-black hover:bg-gray-800 text-white py-2.5 gap-2"
            >
              <MdOutlineColorLens size={20} />
              Use Background
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={() => setIsBackgroundColor(true)}
              className="w-full bg-black hover:bg-gray-800 text-white py-2.5 gap-2"
            >
              <MdOutlineColorLens size={20} />
              Select Color
            </PrimaryButton>
          )}
          <PrimaryButton
            onClick={handleChooseBgAndColor}
            className="w-full py-2.5 gap-2 bg-gray-200"
          >
            Save
          </PrimaryButton>
        </div>
      </div>
    </CustomModal>
  );
}
