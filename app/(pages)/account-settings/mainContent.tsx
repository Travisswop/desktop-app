"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import uploadImgIcon from "@/public/images/upload_image_icon.svg";
import { FiUser } from "react-icons/fi";
import { FaRegUserCircle } from "react-icons/fa";
import { MdOutlineEmail } from "react-icons/md";
import { SlCalender } from "react-icons/sl";
import SelectAvatorModal from "@/components/modal/SelectAvatorModal";
import { Spinner, useDisclosure } from "@nextui-org/react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import ProfileLoading from "@/components/loading/ProfileLoading";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import "react-datepicker/dist/react-datepicker.css";
import { format, parse } from "date-fns";
import { updateUserProfile } from "@/actions/updateUserProfile";
import { useRouter } from "next/navigation";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import toast from "react-hot-toast";
import isUrl from "@/lib/isUrl";
import UploadImageButton from "@/components/Button/UploadImageButton";
import AnimateButton from "@/components/ui/Button/AnimateButton";
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

const UpdateProfile = ({ data, token, switchToTab }: any) => {
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

  const handleGoToSubscriptions = () => {
    switchToTab("subscriptions");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: data.data.email,
            id: data.data._id,
          }),
        }
      );

      console.log("delete response", response);

      if (response.ok) {
        toast.success("Account deletion request sent");
        router.push("/login");
      } else {
        toast.error("Failed to request account deletion");
      }
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
      <section className="bg-white w-full h-full flex items-center justify-center">
        <div className="bg-white w-full overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-8 w-full h-full mb-4 sm:mb-10">
              <div className="flex-1 flex flex-col gap-y-4 items-start">
                <h1 className="text-xl font-bold">Parent Profile</h1>
                <p className="text-sm text-gray-600 text-start">
                  This is your account profile used to <br /> manage the Swop
                  ecosystem
                </p>
                <div className="w-48 h-48 overflow-hidden rounded-full border-2 border-[#8A2BE2] border-opacity-20 relative">
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
                  <div className="bg-[#3f3f3f50] absolute top-1/2 w-full h-full">
                    <button type="button" onClick={handleModal}>
                      <Image
                        src={uploadImgIcon}
                        alt="upload image icon"
                        width={28}
                        className="absolute left-1/2 top-8 -translate-x-[50%]"
                      />
                    </button>
                  </div>
                </div>
                <UploadImageButton handleModal={handleModal} />
              </div>
              {loading ? (
                <div className="flex-1 lg:flex-[1.5] xl:flex-[2]">
                  <ProfileLoading />
                </div>
              ) : (
                <div className="flex-1 lg:flex-[1.5] xl:flex-[2]">
                  <h6 className="font-semibold mb-4 text-lg">Parent Profile</h6>
                  {/* <p>country code: {countryCode}</p> */}
                  <div className="grid grid-cols-2 gap-y-6 gap-x-10">
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
                    <div className="">
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
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 w-max">
                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="bg-black text-white py-1.5 rounded-xl px-10 mx-auto"
                    >
                      {submitLoading ? (
                        <Spinner size="sm" color="white" />
                      ) : (
                        <div className="py-0.5">Save</div>
                      )}
                    </button>
                    <AnimateButton
                      onClick={() => router.back()}
                      type="button"
                      // disabled={submitLoading}
                      width="w-32"
                    >
                      Cancel
                    </AnimateButton>
                  </div>
                </div>
              )}
            </div>
          </form>
          <hr />
          <div className="border-none mt-6">
            <div className="">
              <h3 className="text-lg font-semibold mb-2">Delete my account</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Do you want to downgrade instead?{" "}
                <button
                  onClick={handleGoToSubscriptions}
                  className="text-gray-700 underline underline-offset-4 font-medium"
                >
                  Manage Subscriptions
                </button>
              </p>
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

export default UpdateProfile;
