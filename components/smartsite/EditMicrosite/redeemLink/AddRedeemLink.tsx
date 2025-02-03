import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Switch,
  Tooltip,
} from '@nextui-org/react';
import { LiaFileMedicalSolid } from 'react-icons/lia';
import { FaAngleDown, FaTimes } from 'react-icons/fa';

import filePlaceholder from '@/public/images/placeholder-photo.png';
import AnimateButton from '@/components/ui/Button/AnimateButton';
import { MdInfoOutline } from 'react-icons/md';
import toast from 'react-hot-toast';
import placeholder from '@/public/images/image_placeholder.png';
import CustomFileInput from '@/components/CustomFileInput';
import { usePrivy } from '@privy-io/react-auth';
import { sendCloudinaryImage } from '@/lib/SendCloudineryImage';
// import { useRouter } from "next/router";
import { usePathname } from 'next/navigation';
import { postRedeem } from '@/actions/redeem';
import Cookies from 'js-cookie';
import { postFeed } from '@/actions/postFeed';
import { useUser } from '@/lib/UserContext';
import {
  fromTokenLamports,
  RedemptionPool,
} from '@/components/wallet/redeem/token-list';

const AddRedeemLink = ({
  handleRemoveIcon,
  handleToggleIcon,
}: any) => {
  const { user } = usePrivy();
  const { user: userInfo } = useUser();

  console.log('usser form userInfo', userInfo);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [description, setDescription] = useState('');
  const [linkName, setLinkName] = useState('');
  const [imageFile, setImageFile] = useState<any>(null);
  const [imageFileError, setImageFileError] = useState<string>('');
  const [pools, setPools] = useState<any>([]);
  const [isPoolLoading, setIsPoolLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null); // State to store the selected token
  const [accessToken, setAccessToken] = useState<any>(null);
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get('access-token');
      if (token) {
        setAccessToken(token);
      }
    };
    getAccessToken();
  }, []);

  const smartsiteid = usePathname();

  // console.log("id", id);

  useEffect(() => {
    const fetchPools = async () => {
      try {
        setIsPoolLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/getRedeemPoolList/${user?.id}`
        );

        if (response.ok) {
          const { data } = await response.json();
          console.log('🚀 ~ fetchPools ~ data:', data);
          const items = data.map((pool: RedemptionPool) => ({
            ...pool,
            total_amount: fromTokenLamports(
              pool.total_amount,
              pool.token_decimals
            ),
            remaining_amount: fromTokenLamports(
              pool.remaining_amount,
              pool.token_decimals
            ),
            tokens_per_wallet: fromTokenLamports(
              pool.tokens_per_wallet,
              pool.token_decimals
            ),
            total_redeemed_amount: fromTokenLamports(
              pool.total_redeemed_amount || '0',
              pool.token_decimals
            ),
            redeemLink: `${process.env.NEXT_PUBLIC_APP_URL}/redeem/${pool.pool_id}`,
          }));
          setPools(items);
        } else {
          toast.error('Failed to fetch redemption pools');
        }
      } catch (error) {
        console.error('Error fetching pools:', error);
        toast.error('Failed to fetch redemption pools');
      } finally {
        setIsPoolLoading(false);
      }
    };
    fetchPools();
  }, [user?.id]);

  const handleImageFileChange = (event: any) => {
    // get image file
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        // Check if file size is greater than 10 MB
        setImageFileError('File size should be less than 10 MB');
        setImageFile(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageFile(reader.result as any);
          setImageFileError('');
        };
        reader.readAsDataURL(file);
      }
    } else {
      setImageFileError('Please upload a image file.');
    }
  };

  const handleRedeemFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();

    let imageUrl = selectedToken?.token_logo;
    if (imageFile) {
      imageUrl = await sendCloudinaryImage(imageFile);
    }

    // console.log("imageUrl", imageUrl);

    // const formData = new FormData(e.currentTarget);
    const redeemInfo = {
      tokenType: 'token',
      network:
        selectedToken.token_name.charAt(0).toUpperCase() +
        selectedToken.token_name.slice(1).toLowerCase(),
      imageUrl: imageUrl,
      link: selectedToken.redeemLink,
      mintName: linkName,
      mintLimit: selectedToken.max_wallets,
      amount: selectedToken.total_amount,
      symbol: selectedToken.token_symbol,
      description: description,
      micrositeId: smartsiteid.split('/').pop(),
      tokenUrl: imageUrl,
    };
    // console.log("redeemInfo", redeemInfo);
    try {
      const data = await postRedeem(redeemInfo, accessToken);
      // console.log("datassdg", data);

      if ((data.state = 'success')) {
        if (isSelected) {
          const id = smartsiteid.split('/').pop();
          const smartsite = userInfo?.microsites?.find(
            (microsite: any) => microsite._id == id
          );

          const payload = {
            smartsiteId: id,
            userId: userInfo?._id,
            smartsiteUserName: smartsite.name,
            smartsiteEnsName: smartsite.ens || smartsite.ensData.name,
            smartsiteProfilePic: smartsite.profilePic,
            postType: 'redeem',
            content: {
              redeemName: redeemInfo.mintName,
              symbol: redeemInfo.symbol,
              network: redeemInfo.network,
              link: redeemInfo.link,
              amount: redeemInfo.amount,
              mintLimit: redeemInfo.mintLimit,
              tokenImgUrl: redeemInfo.imageUrl,
            },
          };
          await postFeed(payload, accessToken);
        }

        toast.success('Redeem crated successfully');
        handleRemoveIcon('Redeem Link');
      } else {
        toast.error('Something went wrong');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenSelect = (pool: any) => {
    setSelectedToken(pool);
  };

  return (
    <div className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
      {/* Top part */}
      <div className="flex items-end gap-1 justify-center">
        <h2 className="font-semibold text-gray-700 text-xl text-center">
          Redeem Link
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                Create a portal that people can click to collect
                tokens and collectables.
              </span>
            }
            className="max-w-40 h-auto"
          >
            <button>
              <MdInfoOutline />
            </button>
          </Tooltip>
        </div>
      </div>
      <button
        className="absolute top-3 right-3"
        type="button"
        onClick={() => handleRemoveIcon('Redeem Link')}
      >
        <FaTimes size={18} />
      </button>

      <div className="flex flex-col gap-2 mt-4 xl:px-4 2xl:px-[10%]">
        <div className="bg-white rounded-xl shadow-medium w-full flex items-center gap-2 p-3 mb-1">
          {imageFile ? (
            <Image
              className="w-14 h-14 rounded-lg"
              src={imageFile}
              width={120}
              height={120}
              quality={100}
              alt="icon"
            />
          ) : (
            <Image
              className="w-14 h-14 rounded-lg"
              src={
                selectedToken?.token_logo
                  ? selectedToken.token_logo
                  : placeholder
              }
              quality={100}
              width={selectedToken?.token_logo && 90}
              height={selectedToken?.token_logo && 90}
              alt="icon"
            />
          )}
          <div>
            <p className="text-gray-700 font-medium">
              {linkName ? linkName : 'Redeemable'}
            </p>
            <p className="text-gray-500 text-sm font-normal">
              {description
                ? description
                : 'Click to Redeem a Free Digital Collectible'}
            </p>
          </div>
        </div>

        {/* Middle part */}
        <div>
          <form
            onSubmit={handleRedeemFormSubmit}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-4">
              <div className="w-full bg-white shadow-medium rounded-xl p-4">
                <div className="bg-gray-100 rounded-xl p-4 flex flex-col items-center gap-2">
                  <div className="w-16 h-10">
                    <Image
                      src={filePlaceholder}
                      alt="placeholder"
                      className="w-10 h-auto mx-auto"
                    />
                  </div>
                  <p className="text-gray-400 font-normal text-sm">
                    Redeem Link Icon
                  </p>
                  <CustomFileInput
                    title={'Browse'}
                    handleFileChange={handleImageFileChange}
                  />
                  {imageFileError && (
                    <p className="text-red-600 font-medium text-sm mt-1">
                      {imageFileError}
                    </p>
                  )}
                </div>
              </div>
              <div className="w-full">
                <div className="flex items-center gap-1 mb-1">
                  <p className="font-medium">Post in Feed</p>
                  <Switch
                    size="sm"
                    isSelected={isSelected}
                    onValueChange={setIsSelected}
                  />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-semibold text-gray-700 w-44">
                    Select Token
                  </h3>
                  <Dropdown
                    className="w-full rounded-lg"
                    placement="bottom-start"
                  >
                    <DropdownTrigger>
                      <button
                        type="button"
                        className="bg-white mb-2 xl:mb-0 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small w-full"
                      >
                        <span className="flex items-center gap-2">
                          {selectedToken
                            ? `${selectedToken.token_symbol} | ${selectedToken.total_amount} | ${selectedToken.max_wallets}`
                            : 'Token | Amount | Limit'}
                        </span>
                        <FaAngleDown />
                      </button>
                    </DropdownTrigger>
                    <DropdownMenu
                      disabledKeys={['title']}
                      aria-label="Static Actions"
                      className="p-2"
                    >
                      <DropdownItem
                        key={'title'}
                        className="hover:!bg-white opacity-100 cursor-text disabled dropDownTitle"
                      >
                        <p>Choose A Token</p>
                      </DropdownItem>
                      {isPoolLoading ? (
                        <DropdownItem className="border-b rounded-none hover:rounded-md">
                          <p className="">loading...</p>
                        </DropdownItem>
                      ) : (
                        pools.map((pool: any, index: number) => (
                          <DropdownItem
                            key={index}
                            onClick={() => handleTokenSelect(pool)}
                            className="border-b rounded-none hover:rounded-md"
                          >
                            <div className="flex items-center gap-2 font-semibold text-sm">
                              {`${pool.token_symbol} | ${pool.total_amount} | ${pool.max_wallets}`}
                            </div>
                          </DropdownItem>
                        ))
                      )}
                    </DropdownMenu>
                  </Dropdown>
                </div>
                <p className="font-semibold text-gray-700 mb-0.5">
                  Amount
                </p>
                <div>
                  <input
                    type="text"
                    name="amount"
                    value={
                      selectedToken ? selectedToken.total_amount : ''
                    }
                    readOnly
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                    placeholder={'Enter Amount'}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="w-full flex items-center gap-4">
              <div className="w-full">
                <p className="font-semibold text-gray-700 mb-0.5">
                  Link Name
                </p>
                <div>
                  <input
                    type="text"
                    name="link"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                    placeholder={'Enter Link Name'}
                    required
                  />
                </div>
              </div>
              <div className="w-full">
                <p className="font-semibold text-gray-700 mb-0.5">
                  Mint Limit
                </p>
                <div>
                  <input
                    type="text"
                    name="mintLimit"
                    value={
                      selectedToken ? selectedToken.max_wallets : ''
                    }
                    readOnly
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                    placeholder={'Enter Mint Limit'}
                    required
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-1">
                Description
              </p>
              <div>
                <textarea
                  name="description"
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                  placeholder="Enter description"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-center">
              <AnimateButton
                // isDisabled
                whiteLoading={true}
                className="bg-black text-white py-2 !border-0"
                isLoading={isLoading}
                width={'w-40'}
              >
                <LiaFileMedicalSolid size={20} />
                Create
              </AnimateButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRedeemLink;

// <div className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">

//       <div className="flex items-end gap-1 justify-center">
//         <h2 className="font-semibold text-gray-700 text-xl text-center">
//           Redeem Link
//         </h2>
//         <div className="translate-y-0.5">
//           <Tooltip
//             size="sm"
//             content={
//               <span className="font-medium">
//                 Create a portal that people can click to collect tokens and
//                 collectables.
//               </span>
//             }
//             className={`max-w-40 h-auto`}
//           >
//             <button>
//               <MdInfoOutline />
//             </button>
//           </Tooltip>
//         </div>
//       </div>
//       <button
//         className="absolute top-3 right-3"
//         type="button"
//         onClick={() => handleRemoveIcon("Redeem Link")}
//       >
//         <FaTimes size={18} />
//       </button>

//       <div className="flex flex-col gap-2 mt-4 px-10 2xl:px-[10%]">
//         <div className="bg-white rounded-xl shadow-medium w-full flex items-center gap-2 p-3 mb-1">
//           {imageFile ? (
//             <Image
//               className="w-14 h-14 rounded-lg"
//               src={imageFile}
//               width={120}
//               height={120}
//               alt="icon"
//             />
//           ) : (
//             <Image
//               className="w-14 h-14 rounded-lg"
//               src={placeholder}
//               alt="icon"
//             />
//           )}
//           <div>
//             <p className="text-gray-700 font-medium">
//               {linkName ? linkName : "Redeemable"}
//             </p>
//             <p className="text-gray-500 text-sm font-normal">
//               {description
//                 ? description
//                 : "Click to Redeem a Free Digital Collectible"}
//             </p>
//           </div>
//         </div>

//         <div>
//           <form
//             onSubmit={handleInfoBarFormSubmit}
//             className="flex flex-col gap-3"
//           >
//             <div className="flex items-center gap-4">
//               <div className="w-full bg-white shadow-medium rounded-xl p-4">
//                 <div className="bg-gray-100 rounded-xl p-4 flex flex-col items-center gap-2">
//                   <div className="w-16 h-10">
//                     <Image
//                       src={filePlaceholder}
//                       alt="placeholder"
//                       className="w-10 h-auto mx-auto"
//                     />
//                   </div>
//                   <p className="text-gray-400 font-normal text-sm">
//                     Redeem Link Icon
//                   </p>
//                   <CustomFileInput
//                     title={"Browse"}
//                     handleFileChange={handleImageFileChange}
//                   />

//                   {imageFileError && (
//                     <p className="text-red-600 font-medium text-sm mt-1">
//                       {imageFileError}
//                     </p>
//                   )}
//                 </div>
//               </div>
//               <div className="w-full">
//                 <div className="flex flex-col xl:flex-row items-center gap-x-2">
//                   <h3 className="font-semibold text-gray-700 w-44">
//                     Select Token
//                   </h3>
//                   <Dropdown
//                     isDisabled
//                     className="w-full rounded-lg"
//                     placement="bottom-start"
//                   >
//                     <DropdownTrigger>
//                       <button
//                         type="button"
//                         className="bg-white mb-2 xl:mb-0 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small w-full"
//                       >
//                         <span className="flex items-center gap-2">
//                           Select Token
//                         </span>{" "}
//                         <FaAngleDown />
//                       </button>
//                     </DropdownTrigger>
//                     <DropdownMenu
//                       disabledKeys={["title"]}
//                       aria-label="Static Actions"
//                       className="p-2"
//                     >
//                       <DropdownItem
//                         key={"title"}
//                         className=" hover:!bg-white opacity-100 cursor-text disabled dropDownTitle"
//                       >
//                         <p>Choose Icon Type</p>
//                       </DropdownItem>
//                       {iconData.icons.map((data: any, index: number) => (
//                         <DropdownItem
//                           key={index}
//                           onClick={() => handleSelectIconType(data.category)}
//                           className="border-b rounded-none hover:rounded-md"
//                         >
//                           <div className="flex items-center gap-2 font-semibold text-sm">
//                             <Image
//                               src={data.categoryIcon}
//                               alt={data.category}
//                               className="w-5 h-auto"
//                             />{" "}
//                             {data.category}
//                           </div>
//                         </DropdownItem>
//                       ))}
//                       <DropdownItem
//                         onClick={() => handleSelectIconType("Product Link")}
//                         className="border-b rounded-none hover:rounded-md"
//                       >
//                         <div className="flex items-center gap-2 font-semibold text-sm">
//                           <Image
//                             src={productImg}
//                             alt={"product"}
//                             className="w-5 h-auto"
//                           />
//                           <p>Product Link</p>
//                         </div>
//                       </DropdownItem>
//                       <DropdownItem
//                         onClick={() => handleSelectIconType("Contact Card")}
//                         className="border-b rounded-none hover:rounded-md"
//                       >
//                         <div className="flex items-center gap-2 font-semibold text-sm">
//                           <Image
//                             src={contactCardImg}
//                             alt={"contact card"}
//                             className="w-5 h-auto"
//                           />
//                           <p>Contact Card</p>
//                         </div>
//                       </DropdownItem>
//                     </DropdownMenu>
//                   </Dropdown>
//                 </div>
//                 <p className="font-semibold text-gray-700 mb-0.5">Amount</p>
//                 <div>
//                   <input
//                     type="text"
//                     name="amount"
//                     className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
//                     placeholder={"Enter Amount"}
//                     required
//                   />
//                 </div>
//               </div>
//             </div>
//             <div className="w-full flex items-center gap-4">
//               <div className="w-full">
//                 <p className="font-semibold text-gray-700 mb-0.5">Link Name</p>
//                 <div>
//                   <input
//                     type="text"
//                     name="link"
//                     className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
//                     placeholder={"Enter Link Name"}
//                     required
//                   />
//                 </div>
//               </div>
//               <div className="w-full">
//                 <p className="font-semibold text-gray-700 mb-0.5">Mint Limit</p>
//                 <div>
//                   <input
//                     type="text"
//                     name="mintLimit"
//                     className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
//                     placeholder={"Enter Mint Limit"}
//                     required
//                   />
//                 </div>
//               </div>
//             </div>
//             <div>
//               <p className="font-semibold text-gray-700 mb-1">Description</p>
//               <div>
//                 <textarea
//                   name="description"
//                   className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
//                   placeholder="Enter description"
//                   onChange={(e) => setDescription(e.target.value)}
//                 />
//               </div>
//             </div>
//             <div className="flex justify-center">
//               <AnimateButton
//                 isDisabled
//                 whiteLoading={true}
//                 className="bg-black text-white py-2 !border-0"
//                 isLoading={isLoading}
//                 width={"w-40"}
//               >
//                 <LiaFileMedicalSolid size={20} />
//                 Create
//               </AnimateButton>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
