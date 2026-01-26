"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FiUser } from "react-icons/fi";
import { FaRegUserCircle } from "react-icons/fa";
import { MdOutlineEmail } from "react-icons/md";
import { SlCalender } from "react-icons/sl";
import SelectAvatorModal from "@/components/modal/SelectAvatorModal";
import { useDisclosure } from "@nextui-org/react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import ProfileLoading from "@/components/loading/ProfileLoading";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import "react-datepicker/dist/react-datepicker.css";
import { updateUserProfile } from "@/actions/updateUserProfile";
import { useRouter } from "next/navigation";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import toast from "react-hot-toast";
import isUrl from "@/lib/isUrl";
import UploadImageButton from "@/components/Button/UploadImageButton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { Loader, MapPin } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";

const SWOP_ID_GATEWAY = "https://swop-id-ens-gateway.swop.workers.dev";

const EditProfileContent = ({ data, token }: any) => {
  console.log("data", data);
  const [selectedImage, setSelectedImage] = useState(null);
  const [galleryImage, setGalleryImage] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [value, setValue] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [dobDate, setDobDate] = useState<any>(new Date().getTime());

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const router = useRouter();
  const { wallets } = useWallets();

  const deleteEnsName = async (ensName: string) => {
    try {
      const ethereumWallet = wallets.find(
        (wallet) =>
          wallet.type === "ethereum" && wallet.walletClientType === "privy",
      );

      if (!ethereumWallet) {
        console.warn("No Ethereum wallet found, skipping ENS deletion");
        return; // Don't block account deletion
      }

      const provider = await ethereumWallet.getEthereumProvider();
      const address = ethereumWallet.address;
      const message = `I am deleting ${ensName}`;

      // Sign message
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, address],
      });

      // Delete ENS from gateway
      const response = await fetch(`${SWOP_ID_GATEWAY}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ensName,
          owner: address,
          signature: { hash: signature, message },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.warn("Failed to delete ENS name:", errorData);
      }
    } catch (error) {
      console.error("Error deleting ENS name:", error);
      // Don't throw - allow account deletion to proceed
    }
  };

  const deleteUserAccount = async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.data.email,
          id: data.data._id,
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to delete account");
    }

    toast.success("Successfully deleted account");
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      const primaryMicrosite = data.data?.microsites?.find(
        (microsite: any) => microsite.primary,
      );

      console.log(
        "primaryMicrosite?.ens?.toLowerCase()",
        primaryMicrosite?.ens?.toLowerCase(),
      );

      // Delete ENS name if exists
      if (primaryMicrosite?.ens?.includes(".swop.id")) {
        await deleteEnsName(primaryMicrosite?.ens?.toLowerCase());
      }

      // Delete user account
      await deleteUserAccount();
    } catch (error) {
      console.error("Error requesting account deletion:", error);
      toast.error("Something went wrong!");
    } finally {
      setIsDeleting(false);
    }
  };

  const images = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
    "31",
    "32",
    "33",
    "34",
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
  ];

  useEffect(() => {
    if (galleryImage) {
      sendCloudinaryImage(galleryImage)
        .then((url) => {
          setUploadedImageUrl(url);
          setSelectedImage(null);
        })
        .catch((err) => {
          console.error("Error uploading image:", err);
        });
    }
  }, [galleryImage]);

  const handleSubmit = async (e: any) => {
    setSubmitLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const mobileNumber: any = formData.get("mobileNo");
    const userInfo = {
      _id: data.data._id,
      name: formData.get("name"),
      mobileNo: phone || "",
      address: value?.label || "",
      bio: formData.get("bio"),
      dob: dobDate,
      profilePic: selectedImage || uploadedImageUrl || data.data.profilePic,
      countryCode: mobileNumber?.split(" ")[0] || data.data.countryCode || "+1",
      countryFlag: selectedCountryCode || "us",
      apt: "N/A",
    };

    try {
      const data = await updateUserProfile(userInfo, token);

      if (data.state === "success") {
        router.push("/");
        toast.success("Profile updated");
      }
    } catch (error) {
      toast.error("something went wrong!");
      console.error("error from hola", error);
      setSubmitLoading(false);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSelectImage = (image: any) => {
    setSelectedImage(image);
    setGalleryImage(null);
  };

  const handleModal = () => {
    onOpen();
    setIsModalOpen(true);
  };

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      setIsModalOpen(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(null);
        setGalleryImage(reader.result as any);
      };
      reader.readAsDataURL(file);
    }
  };

  const dateInputRef = useRef<any>(null);

  const handleDateIconClick = () => {
    dateInputRef?.current?.showPicker();
  };

  useEffect(() => {
    if (data.data) {
      setDobDate(data.data.dob);
      setPhone(data.data.mobileNo);
      setValue({
        label: data.data.address,
        value: {
          description: data.data.address,
          structured_formatting: {
            main_text: data.data.address.split(",")[0],
            secondary_text: data.data.address.split(",").slice(1).join(", "),
          },
        },
      });
    }
  }, [data.data]);

  if (data.data) {
    return (
      <section className="bg-white max-w-full h-full flex items-center justify-center p-5 lg:p-20 lg:mx-20 rounded-xl">
        <div className="w-full">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-8 w-full h-full mb-4 sm:mb-10"
          >
            <div className="flex flex-col gap-y-4 items-center">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold mb-1 text-center">
                  Edit Your Profile Information
                </h1>
                <p className="text-sm text-gray-600 text-center w-60 sm:w-72 mx-auto">
                  This is your parent profile used for shopping and wallet
                  features.
                </p>
              </div>
              <div className="w-40 h-40 overflow-hidden rounded-full border-2 border-black border-opacity-20 relative">
                <div className="bg-white">
                  {galleryImage && (
                    <Image
                      src={galleryImage}
                      fill
                      alt="image"
                      quality={100}
                      className="rounded-full bg-white"
                    />
                  )}

                  {selectedImage && (
                    <Image
                      src={`/images/user_avator/${selectedImage}@3x.png`}
                      width={260}
                      height={260}
                      alt="avator"
                      quality={100}
                      className="rounded-full w-full h-full bg-white"
                    />
                  )}

                  {!galleryImage && !selectedImage && (
                    <Image
                      src={
                        isUrl(data.data.profilePic)
                          ? data.data.profilePic
                          : `/images/user_avator/${data.data.profilePic}@3x.png`
                      }
                      fill
                      alt="avator"
                      quality={100}
                      className="rounded-full bg-white"
                    />
                  )}
                </div>
                {/* <div className="bg-[#3f3f3f50] absolute top-1/2 w-full h-full">
                  <button type="button" onClick={handleModal}>
                    <Image
                      src={uploadImgIcon}
                      alt="upload image icon"
                      width={28}
                      className="absolute left-1/2 top-8 -translate-x-[50%]"
                    />
                  </button>
                </div> */}
              </div>
              <UploadImageButton handleModal={handleModal} />
            </div>
            {loading ? (
              <div className="flex-1 lg:flex-[1.5] xl:flex-[2]">
                <ProfileLoading />
              </div>
            ) : (
              <div className="flex-1 lg:flex-[1.5] xl:flex-[2]">
                {/* <h6 className="font-semibold mb-4 text-lg">Parent Profile</h6> */}
                {/* <p>country code: {countryCode}</p> */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 sm:gap-y-6 gap-x-10">
                  <div className="">
                    <label htmlFor="fullName" className="mb-2 block">
                      Name
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <FiUser
                        className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                        size={19}
                      />
                      <input
                        type="text"
                        id="fullName"
                        name="name"
                        defaultValue={data.data.name}
                        required
                        placeholder="Enter name"
                        className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-gray-100"
                      />
                    </div>
                  </div>
                  <div className="">
                    <label htmlFor="bio" className="mb-2 block">
                      Bio
                    </label>
                    <div className="relative">
                      <FaRegUserCircle
                        className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                        size={18}
                      />
                      <input
                        type="text"
                        id="bio"
                        name="bio"
                        defaultValue={data.data.bio}
                        placeholder="Enter bio"
                        className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-gray-100"
                      />
                    </div>
                  </div>
                  <div className="">
                    <label htmlFor="phone" className="mb-2 block">
                      Phone Number
                    </label>
                    {loading ? (
                      "loading..."
                    ) : (
                      <PhoneInput
                        defaultCountry={data.data.countryFlag.toLowerCase()}
                        forceDialCode={true}
                        value={phone}
                        name="mobileNo"
                        onChange={(phone, country) => {
                          setPhone(phone);
                          setSelectedCountryCode(country.country.iso2); // Update the selected country code
                        }}
                        className="w-full"
                      />
                    )}
                  </div>
                  <div className="">
                    <label htmlFor="email" className="mb-2 block">
                      Email
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <MdOutlineEmail
                        className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                        size={19}
                      />
                      <input
                        type="text"
                        id="email"
                        defaultValue={data.data.email}
                        required
                        readOnly
                        placeholder="Enter email"
                        className="w-full cursor-not-allowed border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-gray-100"
                      />
                    </div>
                  </div>
                  <div className="">
                    <label htmlFor="birthDate" className="mb-2 block">
                      Birth Date
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative" onClick={handleDateIconClick}>
                      <button type="button">
                        <SlCalender
                          className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                          size={16}
                        />
                      </button>
                      <input
                        type="date"
                        id="birthDate"
                        ref={dateInputRef}
                        required
                        value={
                          dobDate
                            ? new Date(dobDate).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          setDobDate(new Date(e.target.value).getTime())
                        }
                        placeholder="Enter birth date"
                        className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-gray-100"
                      />
                    </div>
                  </div>
                  {/* <div className="">
                    <label htmlFor="address" className="mb-2 block">
                      Address (Shopping Delivery Address)
                    </label>

                    <GooglePlacesAutocomplete
                      apiKey={
                        process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ""
                      }
                      selectProps={{
                        value,
                        onChange: setValue as any,
                        placeholder: "Enter address",
                      }}
                    />
                  </div> */}
                  <div className="w-full">
                    <label htmlFor="address" className="mb-2 block">
                      Address (Shopping Delivery Address)
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                      </span>

                      <GooglePlacesAutocomplete
                        apiKey={
                          process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ""
                        }
                        selectProps={{
                          value,
                          onChange: setValue as any,
                          placeholder: "Enter address",
                          styles: {
                            control: (base, state) => ({
                              ...base,
                              paddingLeft: "1.35rem", // space for icon
                              // minHeight: "42px",
                              borderRadius: "0.5rem",
                              border: state.isFocused
                                ? "1px solid #edebeb" // focus (blue-600)
                                : "1px solid #edebeb",
                              boxShadow: state.isFocused
                                ? "1px solid #edebeb"
                                : "none",
                              "&:hover": {
                                border: state.isFocused
                                  ? "1px solid #edebeb"
                                  : "1px solid #edebeb", // hover (gray-300)
                              },
                            }),
                            input: (base) => ({
                              ...base,
                              margin: 0,
                              padding: 0,
                            }),
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-10 flex items-center gap-3 justify-center">
                  <PrimaryButton
                    type="submit"
                    disabled={submitLoading}
                    className="py-2 rounded-xl px-32"
                  >
                    {submitLoading ? (
                      <Loader className="animate-spin" size={24} />
                    ) : (
                      "Save"
                    )}
                  </PrimaryButton>
                </div>
              </div>
            )}
          </form>
          {/* <hr />
          <div className="border-none mt-6">
            <div className="">
              <h3 className="text-lg font-semibold mb-2">Delete my account</h3>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    {isDeleting ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      "Delete my account"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div> */}

          {/* Delete Account Section - Danger Zone */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-2xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-red-600"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-red-700 mb-4">
                    Once you delete your account, there is no going back. This
                    will permanently delete your profile, purchase history, and
                    all associated data.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeleting ? (
                          <div className="flex items-center gap-2">
                            <Loader className="animate-spin" size={16} />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          "Delete Account"
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete your account and remove your data from our
                          servers including:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Your profile information</li>
                            <li>Purchase history and orders</li>
                            <li>Saved addresses and preferences</li>
                            <li>All associated data</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Yes, Delete My Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* modal here  */}
        {isModalOpen && (
          <SelectAvatorModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            images={images}
            onSelectImage={handleSelectImage}
            setIsModalOpen={setIsModalOpen}
            handleFileChange={handleFileChange}
          />
        )}
      </section>
    );
  }
};

export default EditProfileContent;
