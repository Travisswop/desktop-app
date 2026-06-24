"use client";
import React, { useEffect, useState } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import ProfileLoading from "@/components/loading/ProfileLoading";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { updateUserProfile } from "@/actions/updateUserProfile";
import { useRouter } from "next/navigation";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import toast from "react-hot-toast";
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
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  FileText,
  Loader,
  Mail,
  MapPin,
  User,
} from "lucide-react";
import { useWallets } from "@privy-io/react-auth";
import { useUser } from "@/lib/UserContext";
import { BentoCard, SectionHead } from "@/components/ui/bento";
import isUrl from "@/lib/isUrl";

const SWOP_ID_GATEWAY = "https://swop-id-ens-gateway.swop.workers.dev";

const labelCls =
  "mb-1.5 flex items-center gap-1 text-[12px] font-medium text-gray-700";
const fieldCls =
  "w-full h-11 rounded-xl border border-black/[0.06] bg-white pl-10 pr-3 text-[13px] text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-black/[0.15]";
const iconCls =
  "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400";

// Bento-styled trigger for the birth-date picker.
const DateField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ value, onClick, placeholder }, ref) => (
  <div className="relative">
    <Calendar className={iconCls} />
    <input
      ref={ref}
      type="text"
      readOnly
      value={value}
      onClick={onClick}
      placeholder={placeholder}
      className={`${fieldCls} cursor-pointer`}
    />
    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
  </div>
));
DateField.displayName = "DateField";

const EditProfileContent = ({ data, token }: any) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [galleryImage] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [value, setValue] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [dobDate, setDobDate] = useState<any>(new Date().getTime());

  const router = useRouter();
  const { wallets } = useWallets();
  const { logout } = useUser();

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
    await logout();
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      const primaryMicrosite = data.data?.microsites?.find(
        (microsite: any) => microsite.primary,
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
    const profilePic = data.data.profilePic;
    const avatarSrc = profilePic
      ? isUrl(profilePic)
        ? profilePic
        : `/images/user_avator/${profilePic}@3x.png`
      : "";
    const initials = (data.data.name || "")
      .split(" ")
      .map((part: string) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <section className="-m-6 min-h-[calc(100%+3rem)] bg-[#fafafa] px-4 py-8 sm:px-6 lg:py-10">
        <div className="mx-auto w-full max-w-[855px]">
          <SectionHead
            title="Edit profile"
            caption="This is your parent profile used for shopping and wallet features."
          />

          <form onSubmit={handleSubmit} className="bento-form">
            <BentoCard padding="p-5 sm:p-7" className="mb-5">
              {/* Profile header */}
              <div className="mb-7 flex items-center gap-4 border-b border-black/[0.06] pb-6">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/[0.06] bg-gray-50">
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt={data.data.name || "Profile"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : initials ? (
                    <span className="text-[18px] font-semibold text-gray-500">
                      {initials}
                    </span>
                  ) : (
                    <User className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-[16px] font-semibold tracking-[-0.01em] text-gray-900">
                    {data.data.name || "Your profile"}
                  </h3>
                  <p className="truncate text-[13px] text-gray-500">
                    {data.data.email}
                  </p>
                </div>
              </div>

              {loading ? (
                <ProfileLoading />
              ) : (
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  {/* Name */}
                  <div>
                    <label htmlFor="fullName" className={labelCls}>
                      Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className={iconCls} />
                      <input
                        type="text"
                        id="fullName"
                        name="name"
                        defaultValue={data.data.name}
                        required
                        placeholder="Enter name"
                        className={fieldCls}
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label htmlFor="bio" className={labelCls}>
                      Bio
                    </label>
                    <div className="relative">
                      <FileText className={iconCls} />
                      <input
                        type="text"
                        id="bio"
                        name="bio"
                        defaultValue={data.data.bio}
                        placeholder="Enter bio"
                        className={fieldCls}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className={labelCls}>
                      Phone number
                    </label>
                    <PhoneInput
                      defaultCountry={data.data.countryFlag.toLowerCase()}
                      forceDialCode={true}
                      value={phone}
                      name="mobileNo"
                      onChange={(phone, country) => {
                        setPhone(phone);
                        setSelectedCountryCode(country.country.iso2);
                      }}
                      className="w-full"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className={labelCls}>
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className={iconCls} />
                      <input
                        type="text"
                        id="email"
                        defaultValue={data.data.email}
                        required
                        readOnly
                        placeholder="Enter email"
                        className={`${fieldCls} cursor-not-allowed bg-gray-50 text-gray-500`}
                      />
                    </div>
                  </div>

                  {/* Birth date */}
                  <div>
                    <label htmlFor="birthDate" className={labelCls}>
                      Birth date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      id="birthDate"
                      selected={dobDate ? new Date(dobDate) : null}
                      onChange={(date) =>
                        setDobDate(date ? date.getTime() : null)
                      }
                      maxDate={new Date()}
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      yearDropdownItemNumber={100}
                      scrollableYearDropdown
                      dateFormat="MMM d, yyyy"
                      placeholderText="Select birth date"
                      wrapperClassName="w-full"
                      popperClassName="bento-datepicker-popper"
                      popperPlacement="bottom-start"
                      customInput={<DateField />}
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label htmlFor="address" className={labelCls}>
                      Address{" "}
                      <span className="font-normal text-gray-400">
                        (shopping delivery address)
                      </span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400">
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
                            control: (base) => ({
                              ...base,
                              minHeight: "2.75rem",
                              paddingLeft: "1.6rem",
                              borderRadius: "0.75rem",
                              borderColor: "rgba(0,0,0,0.06)",
                              backgroundColor: "#fff",
                              boxShadow: "none",
                              fontSize: "13px",
                            }),
                            input: (base) => ({
                              ...base,
                              margin: 0,
                              padding: 0,
                            }),
                            placeholder: (base) => ({
                              ...base,
                              color: "#9ca3af",
                            }),
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </BentoCard>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex h-10 items-center justify-center rounded-full border border-black/[0.06] bg-white px-5 text-[13px] font-semibold text-gray-700 transition hover:border-black/[0.15]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="inline-flex h-10 min-w-[120px] items-center justify-center gap-2 rounded-full bg-gray-950 px-6 text-[13px] font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
              >
                {submitLoading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </form>

          {/* Danger zone */}
          <div className="mt-10">
            <BentoCard
              padding="p-5 sm:p-6"
              className="border-red-200 bg-red-50/60 shadow-none"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-red-900">
                    Danger zone
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-red-700">
                    Once you delete your account, there is no going back. This
                    will permanently delete your profile, purchase history, and
                    all associated data.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={isDeleting}
                        className="mt-4 h-10 rounded-full bg-red-600 px-5 text-[13px] font-semibold hover:bg-red-700"
                      >
                        {isDeleting ? (
                          <div className="flex items-center gap-2">
                            <Loader className="h-4 w-4 animate-spin" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          "Delete account"
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
                          <ul className="mt-2 list-inside list-disc space-y-1">
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
                          Yes, delete my account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </BentoCard>
          </div>
        </div>
      </section>
    );
  }
};

export default EditProfileContent;
