import Image from "next/image";
import React, { useEffect } from "react";
import swop from "@/public/images/live-preview/swop.svg";
import { BiSolidEdit } from "react-icons/bi";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
import isUrl from "@/lib/isUrl";
// import { fontMap } from "../util/customFonts";
import mockupBtn from "@/public/images/mockup-bottom-button.png";
import { fontMap } from "@/lib/fonts";

// import useUpdateSmartIcon from "@/zustandStore/UpdateSmartIcon";
// import useSmallIconToggleStore from "@/zustandStore/SmallIconModalToggle";
// import useSideBarToggleStore from "@/zustandStore/SideBarToggleStore";

const SmartsiteLivePreview = () => {
  //   const setSmartSiteData = useUpdateSmartIcon((state: any) => state.setState);
  //   const { toggle } = useSideBarToggleStore();

  // console.log("data form live", data);
  const { formData, setFormData } = useSmartsiteFormStore();
  //   const { setOn }: any = useSmallIconToggleStore();

  //   const handleTriggerUpdate = (data: {
  //     data: any;
  //     categoryForTrigger: string;
  //   }) => {
  //     setSmartSiteData(data);
  //     setOn(true);
  //   };

  // console.log("audio", data.info.audio);

  console.log("formdata live site", formData);
  // console.log("data", data);

  useEffect(() => {
    setFormData("backgroundImg", "5");
    setFormData("theme", true);
  }, [setFormData]);

  return (
    // <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] xl:h-[660px] w-[300px] xl:w-[360px]">
    //   <div className="h-[32px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
    //   <div className="h-[46px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
    //   <div className="h-[46px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
    //   <div className="h-[64px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
    //   <div className="flex flex-col rounded-[2rem] overflow-hidden w-[272px] xl:w-[334px] h-[572px] xl:h-[636px] bg-white dark:bg-gray-800">
    //     <section
    //       style={{
    //         backgroundImage: formData.theme
    //           ? `url(/images/smartsite-background/${formData.backgroundImg}.png)`
    //           : "",
    //         height: "100%",
    //       }}
    //       className={` overflow-y-auto shadow-md bg-white bg-cover hide-scrollbar ${
    //         formData.fontType && fontMap[formData.fontType.toLowerCase()]
    //       }`}
    //     >
    //       <div className={`h-full flex flex-col`}>
    //         <div className="relative">
    //           {!formData.theme && (
    //             <>
    //               {formData.backgroundImg && (
    //                 <>
    //                   <div className="bg-white p-2 rounded-xl shadow-md">
    //                     <Image
    //                       alt="banner image"
    //                       src={`/images/smartsite-banner/${formData.backgroundImg}.png`}
    //                       width={800}
    //                       height={400}
    //                       className="rounded-xl w-full h-auto"
    //                     />
    //                   </div>
    //                 </>
    //               )}
    //             </>
    //           )}

    //           <div
    //             className={`${
    //               !formData.theme
    //                 ? "absolute top-full -translate-y-1/2 left-1/2 -translate-x-1/2"
    //                 : "flex justify-center pt-24"
    //             } `}
    //           >
    //             {formData.galleryImg ? (
    //               <>
    //                 <Image
    //                   alt="user image"
    //                   src={formData.galleryImg}
    //                   width={300}
    //                   height={300}
    //                   quality={100}
    //                   className="rounded-full w-28 xl:w-36 2xl:w-40 h-28 xl:h-36 p-0.5 bg-white shadow-medium"
    //                 />
    //               </>
    //             ) : (
    //               <>
    //                 {formData.profileImg ? (
    //                   <>
    //                     {isUrl(formData.profileImg) ? (
    //                       <Image
    //                         alt="user image"
    //                         src={formData.profileImg}
    //                         width={300}
    //                         height={300}
    //                         quality={100}
    //                         className="rounded-full w-28 xl:w-36 2xl:w-40 h-28 xl:h-36 p-0.5 bg-white shadow-medium"
    //                       />
    //                     ) : (
    //                       <Image
    //                         alt="user image"
    //                         src={`/images/user_avator/${formData.profileImg}@3x.png`}
    //                         width={300}
    //                         height={300}
    //                         quality={100}
    //                         className="rounded-full w-28 xl:w-36 h-auto p-0.5 bg-white shadow-medium border-2 border-gray-200"
    //                       />
    //                     )}
    //                   </>
    //                 ) : (
    //                   <Image
    //                     alt="user image"
    //                     src={`/images/user_avator/1@3x.png`}
    //                     width={140}
    //                     height={140}
    //                     className="rounded-full w-28 xl:w-36 h-auto p-1 bg-white shadow-medium border-2 border-gray-200"
    //                   />
    //                 )}
    //               </>
    //             )}
    //           </div>
    //         </div>
    //         <div
    //           className={`${
    //             !formData.theme && "mt-[4.5rem] xl:mt-20 2xl:mt-28"
    //           }  flex flex-col gap-6 mt-6`}
    //         >
    //           <div
    //             className={`flex flex-col items-center ${
    //               formData.fontType && fontMap[formData.fontType.toLowerCase()]
    //             }`}
    //           >
    //             <p
    //               style={{
    //                 color: formData.fontColor ? formData.fontColor : "gray",
    //                 // fontFamily: "monospace",
    //               }}
    //               className={`text-lg font-bold`}
    //             >
    //               {formData.name ? formData.name : "Example Name"}
    //             </p>
    //             <p
    //               style={{
    //                 color: formData.fontColor && formData.fontColor,
    //               }}
    //               className="text-gray-500 font-medium text-sm"
    //             >
    //               {formData.bio ? formData.bio : "Example Bio"}
    //             </p>
    //           </div>
    //         </div>
    //         <div className="flex h-full items-end justify-center">
    //           <div className="flex items-center justify-center gap-1.5 pb-6 pt-2">
    //             <Image alt="swop logo" src={swop} />
    //             <BiSolidEdit size={18} />
    //           </div>
    //         </div>
    //       </div>
    //     </section>
    //     <div>
    //       <Image src={mockupBtn} alt="navigation button" />
    //     </div>
    //   </div>
    // </div>
    // <div className="relative mx-auto h-[540px] xl:h-[600px] w-[280px] xl:w-[320px] rounded-[42px] border-[12px] border-[#F7F7F7] shadow-small xl:shadow-medium">
    //   <div className="absolute shadow-small xl:shadow-medium left-[-17px] top-[124px] h-[46px] w-[5px] rounded-l-lg bg-gray-100"></div>
    //   <div className="absolute shadow-small xl:shadow-medium left-[-17px] top-[178px] h-[46px] w-[5px] rounded-l-lg bg-gray-100"></div>
    //   <div className="absolute shadow-small xl:shadow-medium -right-[17px] top-[142px] h-[60px] w-[5px] rounded-r-xl bg-gray-100 "></div>
    //   <div className="relative h-full w-full overflow-hidden break-words rounded-[32px] bg-white">
    //     <div className="flex items-center gap-1 justify-center absolute top-2.5 left-1/2 -translate-x-1/2 !z-10">
    //       <div className="h-[5px] w-[40px] rounded-md bg-gray-200"></div>
    //       <div className="h-[6px] w-[6px] rounded-full bg-gray-200"></div>
    //     </div>
    //     <section
    //       style={{
    //         backgroundImage: formData.theme
    //           ? `url(/images/smartsite-background/${formData.backgroundImg}.png)`
    //           : "",
    //         height: "100%",
    //       }}
    //       className={` overflow-y-auto shadow-md bg-white bg-cover hide-scrollbar ${
    //         formData.fontType && fontMap[formData.fontType.toLowerCase()]
    //       }`}
    //     >
    //       <div className={`h-full flex flex-col`}>
    //         <div className="relative">
    //           {!formData.theme && (
    //             <>
    //               {formData.backgroundImg && (
    //                 <>
    //                   <div className="bg-white p-2 rounded-xl shadow-md">
    //                     <Image
    //                       alt="banner image"
    //                       src={`/images/smartsite-banner/${formData.backgroundImg}.png`}
    //                       width={800}
    //                       height={400}
    //                       className="rounded-xl w-full h-auto"
    //                     />
    //                   </div>
    //                 </>
    //               )}
    //             </>
    //           )}

    //           <div
    //             className={`${
    //               !formData.theme
    //                 ? "absolute top-full -translate-y-1/2 left-1/2 -translate-x-1/2"
    //                 : "flex justify-center pt-10"
    //             } `}
    //           >
    //             {formData.galleryImg ? (
    //               <>
    //                 <Image
    //                   alt="user image"
    //                   src={formData.galleryImg}
    //                   width={300}
    //                   height={300}
    //                   quality={100}
    //                   className="rounded-full w-28 xl:w-36 2xl:w-40 h-28 xl:h-36 p-0.5 bg-white shadow-medium"
    //                 />
    //               </>
    //             ) : (
    //               <>
    //                 {formData.profileImg ? (
    //                   <>
    //                     {isUrl(formData.profileImg) ? (
    //                       <Image
    //                         alt="user image"
    //                         src={formData.profileImg}
    //                         width={300}
    //                         height={300}
    //                         quality={100}
    //                         className="rounded-full w-28 xl:w-36 2xl:w-40 h-28 xl:h-36 p-0.5 bg-white shadow-medium"
    //                       />
    //                     ) : (
    //                       <Image
    //                         alt="user image"
    //                         src={`/images/user_avator/${formData.profileImg}@3x.png`}
    //                         width={300}
    //                         height={300}
    //                         quality={100}
    //                         className="rounded-full w-28 xl:w-36 h-auto p-0.5 bg-white shadow-medium border-2 border-gray-200"
    //                       />
    //                     )}
    //                   </>
    //                 ) : (
    //                   <Image
    //                     alt="user image"
    //                     src={`/images/user_avator/1@3x.png`}
    //                     width={140}
    //                     height={140}
    //                     className="rounded-full w-28 xl:w-36 h-auto p-1 bg-white shadow-medium border-2 border-gray-200"
    //                   />
    //                 )}
    //               </>
    //             )}
    //           </div>
    //         </div>
    //         <div
    //           className={`${
    //             !formData.theme && "mt-[4.5rem] xl:mt-20 2xl:mt-28"
    //           }  flex flex-col gap-6 mt-6`}
    //         >
    //           <div
    //             className={`flex flex-col items-center ${
    //               formData.fontType && fontMap[formData.fontType.toLowerCase()]
    //             }`}
    //           >
    //             <p
    //               style={{
    //                 color: formData.fontColor ? formData.fontColor : "gray",
    //                 // fontFamily: "monospace",
    //               }}
    //               className={`text-lg font-bold`}
    //             >
    //               {formData.name ? formData.name : "Example Name"}
    //             </p>
    //             <p
    //               style={{
    //                 color: formData.fontColor && formData.fontColor,
    //               }}
    //               className="text-gray-500 font-medium text-sm"
    //             >
    //               {formData.bio ? formData.bio : "Example Bio"}
    //             </p>
    //           </div>
    //         </div>
    //         <div className="flex h-full items-end justify-center">
    //           <div className="flex items-center justify-center gap-1.5 pb-6 pt-2">
    //             <Image alt="swop logo" src={swop} className="w-16" />
    //             {/* <BiSolidEdit size={18} /> */}
    //           </div>
    //         </div>
    //       </div>
    //     </section>
    //   </div>
    // </div>
    <div className="bg-[url('/images/mobile-mockup.png')] bg-cover bg-center h-[37rem] w-72 mx-auto relative rounded-3xl mt-6 ">
      <section
        style={{
          backgroundImage: formData.theme
            ? `url(/images/smartsite-background/${formData.backgroundImg}.png)`
            : "",
          height: "100%",
        }}
        className={` overflow-y-auto shadow-medium rounded-3xl bg-white bg-cover hide-scrollbar ${
          formData.fontType && fontMap[formData.fontType.toLowerCase()]
        }`}
      >
        <div className={`h-full flex flex-col`}>
          <div className="relative">
            {!formData.theme && (
              <>
                {formData.backgroundImg && (
                  <>
                    <div className="bg-white p-2 rounded-xl shadow-md">
                      <Image
                        alt="banner image"
                        src={`/images/smartsite-banner/${formData.backgroundImg}.png`}
                        width={800}
                        height={400}
                        className="rounded-xl w-full h-auto"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div
              className={`${
                !formData.theme
                  ? "absolute top-full -translate-y-1/2 left-1/2 -translate-x-1/2"
                  : "flex justify-center pt-10"
              } `}
            >
              {formData.galleryImg ? (
                <>
                  <Image
                    alt="user image"
                    src={formData.galleryImg}
                    width={300}
                    height={300}
                    quality={100}
                    className="rounded-full w-20 h-20 p-0.5 bg-white shadow-medium"
                  />
                </>
              ) : (
                <>
                  {formData.profileImg ? (
                    <>
                      {isUrl(formData.profileImg) ? (
                        <Image
                          alt="user image"
                          src={formData.profileImg}
                          width={300}
                          height={300}
                          quality={100}
                          className="rounded-full w-20 h-20 p-0.5 bg-white shadow-medium"
                        />
                      ) : (
                        <Image
                          alt="user image"
                          src={`/images/user_avator/${formData.profileImg}@3x.png`}
                          width={300}
                          height={300}
                          quality={100}
                          className="rounded-full w-20 h-20 p-0.5 bg-white shadow-medium border-2 border-gray-200"
                        />
                      )}
                    </>
                  ) : (
                    <Image
                      alt="user image"
                      src={`/images/user_avator/1@3x.png`}
                      width={140}
                      height={140}
                      className="rounded-full w-20 h-20 p-1 bg-white shadow-medium border-2 border-gray-200"
                    />
                  )}
                </>
              )}
            </div>
          </div>
          <div
            className={`${
              !formData.theme && "mt-12"
            }  flex flex-col gap-6 mt-6`}
          >
            <div
              className={`flex flex-col items-center ${
                formData.fontType && fontMap[formData.fontType.toLowerCase()]
              }`}
            >
              <p
                style={{
                  color: formData.fontColor ? formData.fontColor : "black",
                  // fontFamily: "monospace",
                }}
                className={` font-semibold`}
              >
                {formData.name ? formData.name : "Example Name"}
              </p>
              <p
                style={{
                  color: formData.fontColor && formData.fontColor,
                }}
                className="text-gray-500 font-medium text-xs"
              >
                {formData.bio ? formData.bio : "Example Bio"}
              </p>
            </div>
          </div>
          <div className="flex h-full items-end justify-center">
            <div className="flex items-center justify-center gap-1.5 pb-6 pt-2">
              <Image alt="swop logo" src={swop} className="w-16" />
              {/* <BiSolidEdit size={18} /> */}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SmartsiteLivePreview;
