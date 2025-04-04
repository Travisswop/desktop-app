"use client";
import PushToMintCollectionButton from "@/components/Button/PushToMintCollectionButton";
import { sendCloudinaryImage } from "@/lib/SendCloudineryImage";
import { useUser } from "@/lib/UserContext";
import { useDisclosure } from "@nextui-org/react";
import { useSolanaWallets } from "@privy-io/react-auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DragEvent, useEffect, useState } from "react";
import "react-datepicker/dist/react-datepicker.css";
import MintAlertModal from "./MintAlertModal";
interface FormData {
  name: string;
  nftType: string;
  description: string;
  image: string;
  price: string;
  currency: string;
  benefits: string[];
  enableCreditCard: boolean;
  verifyIdentity: boolean;
  limitQuantity: boolean;
  quantity?: number;
  royaltyPercentage: number;
  startDate: Date;
  endDate: Date;
}

const CreateSubscription = ({ collectionId }: { collectionId: string }) => {
  const router = useRouter();
  const { isOpen, onOpenChange } = useDisclosure();
  const [modelInfo, setModelInfo] = useState({
    flag: null,
    title: "",
    description: "",
  });

  const today = new Date();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    nftType: "subscription",
    description: "",
    image: "",
    price: "",
    currency: "usdc",
    benefits: [],
    enableCreditCard: false,
    verifyIdentity: false,
    limitQuantity: false,
    quantity: undefined,
    royaltyPercentage: 10, // Default royalty percentage
    startDate: today,
    endDate: new Date(today),
  });

  const [newBenefit, setNewBenefit] = useState("");
  const [selectedImageName, setSelectedImageName] = useState<string | null>(
    null
  );
  const [imageUploading, setImageUploading] = useState(false);
  const { user, accessToken } = useUser();
  const { wallets } = useSolanaWallets();
  const [waitForToken, setWaitForToken] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Manage submission state

  const solanaAddress = wallets?.[0]?.address || null;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setWaitForToken(false);
    }, 30000); // Wait for 30 seconds

    return () => clearTimeout(timeoutId); // Cleanup timeout
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      setFormData((prevState) => ({
        ...prevState,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: type === "number" ? parseFloat(value) : value,
      }));
    }
  };

  const handleDateChange = (date: Date, field: "startDate" | "endDate") => {
    setFormData((prevState) => ({
      ...prevState,
      [field]: date,
    }));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const duration = e.target.value;
    const newEndDate = new Date(formData.startDate);

    if (duration === "Weekly") {
      newEndDate.setDate(newEndDate.getDate() + 7);
    } else if (duration === "Monthly") {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else if (duration === "Yearly") {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    setFormData((prevState) => ({
      ...prevState,
      endDate: newEndDate,
    }));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFormData((prevState) => ({
      ...prevState,
      quantity: isNaN(value) ? undefined : value,
    }));
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedImageName(file.name);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result as string;

      try {
        setImageUploading(true);
        const image = await sendCloudinaryImage(base64Image);
        setFormData((prevState) => ({
          ...prevState,
          image: image,
        }));
        setImageUploading(false);
      } catch (error) {
        console.error("Error uploading image:", error);
        setImageUploading(false);
        alert("Failed to upload image. Please try again.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    setSelectedImageName(file.name);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result as string;

      try {
        setImageUploading(true);
        const image = await sendCloudinaryImage(base64Image);
        setFormData((prevState) => ({
          ...prevState,
          image: image,
        }));
        setImageUploading(false);
      } catch (error) {
        console.error("Error uploading image:", error);
        setImageUploading(false);
        alert("Failed to upload image. Please try again.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      setFormData((prevState) => ({
        ...prevState,
        benefits: [...prevState.benefits, newBenefit.trim()],
      }));
      setNewBenefit("");
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setFormData((prevState) => ({
      ...prevState,
      benefits: prevState.benefits.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Map and prepare final data
      const finalData = {
        ...formData,
        startDate: formData.startDate.toISOString(), // Convert to ISO format
        endDate: formData.endDate.toISOString(), // Convert to ISO format
        mintLimit: Number(formData.quantity),
        price: Number(formData.price), // Ensure price is a number
        royaltyPercentage: formData.royaltyPercentage,
        collectionId, // Include collectionId
        ownerAddress: solanaAddress,
        userId: user._id,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/template`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(finalData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.state === "success") {
          // alert("Subscription created successfully!");
          onOpenChange(true);
          setModelInfo({
            flag: true,
            title: "NFT Template created successfully!",
            description: "",
          });
          setTimeout(() => {
            router.push(`/mint/${data?.data?.collectionId}`);
          }, 3000);
        } else {
          // alert(data.message || "Failed to create subscription.");
          onOpenChange(true);
          setModelInfo({
            flag: false,
            title: "Failed to create template",
            description: "",
          });
        }
      } else {
        const errorData = await response.json();
        // alert(errorData.message || "Failed to create subscription.");
        onOpenChange(true);
        setModelInfo({
          flag: false,
          title: "Failed to create subscription.",
          description: "",
        });
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-container flex justify-center">
      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-300 w-full flex flex-wrap md:flex-nowrap flex items-start">
        <div className="w-full md:w-1/2 p-5">
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold">Create Subscription</h2>
              <label className="-mt-2 block font-normal text-sm text-gray-600">
                <span className="text-red-400"> *</span> Required fields
              </label>

              <div>
                <label htmlFor="name" className="mb-1 block font-medium">
                  Name <span className="text-red-400"> *</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Give your subscription a name."
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Note: Your subscription name can&apos;t be changed after
                  creation
                </p>
              </div>

              <label htmlFor="image" className="block font-medium">
                Image <span className="text-red-400"> *</span>
              </label>
              <div
                className="bg-gray-100 p-8 rounded-lg border-2 border-dashed text-center border-gray-300 h-[255px] -mt-2"
                style={{ minWidth: "300px", width: "70%" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleImageDrop}
              >
                {formData.image ? (
                  <div className="flex flex-col items-center">
                    <Image
                      src={formData.image}
                      width={100}
                      height={100}
                      alt="Preview"
                      className="rounded-lg object-cover w-[100px] h-[100px]"
                    />
                    <p className="text-sm mt-2 text-gray-700">
                      {selectedImageName}
                    </p>
                    <label
                      htmlFor="image"
                      className="inline-block bg-black text-white px-4 py-2 rounded-lg mt-2 cursor-pointer"
                    >
                      Change Picture
                    </label>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-col items-center justify-center cursor-pointer ">
                      <div className="text-6xl text-gray-400">
                        <Image
                          src={"/assets/mintIcon/image-upload-icon.png"}
                          width={100}
                          height={100}
                          alt="Preview"
                          className="w-[90px] h-auto"
                        />
                      </div>
                      <p className="text-gray-500 my-3 text-sm">
                        Browse or drag and drop an image here . <br />( JPEG,
                        JPG, PNG )
                      </p>
                      <label
                        htmlFor="image"
                        className="inline-block bg-black text-white px-9 py-2 rounded-lg mt-2 cursor-pointer "
                      >
                        Browse
                      </label>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {imageUploading && (
                  <p className="text-sm text-gray-400">Uploading image...</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="mb-1 block font-medium">
                  Description <span className="text-red-400"> *</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Enter description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label htmlFor="price" className="mb-1 block font-medium">
                  Price <span className="text-red-400"> *</span>
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    id="price"
                    name="price"
                    placeholder="$ 0"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 flex items-center space-x-4"
                    required
                  />
                  <div className="w-full border border-gray-300 rounded-lg px-4 py-2 flex items-center space-x-2">
                    <Image
                      src={"/assets/crypto-icons/USDC.png"}
                      width={100}
                      height={100}
                      alt="Preview"
                      className="w-[22px] h-auto"
                    />
                    <label htmlFor="price" className="font-medium">
                      USDC
                    </label>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Note: Currency can&#39;t be changed after creation
                </p>
              </div>

              <div>
                <label htmlFor="price" className="mb-1 block font-medium">
                  Limit quantity <span className="text-red-400"> *</span>
                </label>
                <input
                  type="text"
                  id="quantity"
                  name="quantity"
                  placeholder="Quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Limit the number of times this digital good can be purchased.
                </p>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="royaltyPercentage"
                  className="mb-1 block font-medium"
                >
                  Royalty Percentage <span className="text-red-400"> *</span>
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    id="royaltyPercentage"
                    name="royaltyPercentage"
                    value={formData.royaltyPercentage}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    min="0"
                    max="100"
                  />
                  <span className="ml-2">%</span>
                </div>
              </div>

              {/* <div className="flex gap-4 w-full">
                <div className="w-full">
                  <label htmlFor="startDate" className="mb-1 block font-medium">
                    Start Date <span className="text-red-400"> *</span>
                  </label>
                  <DatePicker
                    selected={formData.startDate}
                    onChange={(date) =>
                      handleDateChange(date as Date, "startDate")
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    dateFormat="yyyy-MM-dd"
                  />
                </div>
                <div className="w-full">
                  <label htmlFor="duration" className="mb-1 block font-medium">
                    Duration <span className="text-red-400"> *</span>
                  </label>
                  <select
                    id="duration"
                    name="duration"
                    onChange={handleDurationChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select an option
                    </option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div> */}

              <div>
                <label htmlFor="benefits" className="mb-1 block font-medium">
                  Benefits <span className="text-red-400"> *</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter a benefit"
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-2"
                />
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="bg-black text-white px-4 py-2 rounded-lg"
                >
                  + Add Benefit
                </button>
                <div className="flex flex-col gap-2 mt-2">
                  {formData.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-100 px-4 py-2 rounded-lg shadow-sm"
                    >
                      <span className="text-sm">{benefit}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBenefit(index)}
                        className="text-red-500 font-bold"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 mt-4">
                <h3 className="text-md font-medium">
                  Enable Pay with Credit Card
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Let users buy this subscription with a credit card.
                </p>
                <div
                  className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer ${
                    formData.enableCreditCard ? "bg-black" : "bg-gray-300"
                  }`}
                  onClick={() =>
                    setFormData((prevState) => ({
                      ...prevState,
                      enableCreditCard: !prevState.enableCreditCard,
                    }))
                  }
                >
                  <div
                    className={`h-6 w-6 bg-white rounded-full shadow-md transform duration-300 ${
                      formData.enableCreditCard ? "translate-x-6" : ""
                    }`}
                  ></div>
                </div>

                <div className="mt-4">
                  <h3 className="text-md font-medium">Verify Identity</h3>
                  <p className="text-sm text-gray-600">
                    Verify your identity to enable credit card payments. You
                    only complete this process once.
                  </p>
                  <button
                    type="button"
                    onClick={() => alert("Verification triggered!")}
                    className="bg-black text-white px-4 py-2 rounded-lg mt-2"
                  >
                    Verify
                  </button>
                </div>
              </div> */}

              {/* <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 mt-4">
                <h3 className="text-md font-medium">Advanced Settings</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium">Limit quantity</span>
                  <div
                    className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer ${
                      formData.limitQuantity ? "bg-black" : "bg-gray-300"
                    }`}
                    onClick={() =>
                      setFormData((prevState) => ({
                        ...prevState,
                        limitQuantity: !prevState.limitQuantity,
                      }))
                    }
                  >
                    <div
                      className={`h-6 w-6 bg-white rounded-full shadow-md transform duration-300 ${
                        formData.limitQuantity ? "translate-x-6" : ""
                      }`}
                    ></div>
                  </div>
                </div>
                {formData.limitQuantity && (
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter quantity"
                    value={formData.quantity || ""}
                    onChange={handleQuantityChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-2"
                  />
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Limit the number of times this digital good can be purchased.
                </p>

                <div className="mt-4">
                  <label
                    htmlFor="royaltyPercentage"
                    className="block font-medium mb-1"
                  >
                    Royalty Percentage
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      id="royaltyPercentage"
                      name="royaltyPercentage"
                      value={formData.royaltyPercentage}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      min="0"
                      max="100"
                    />
                    <span className="ml-2">%</span>
                  </div>
                </div>
              </div> */}

              <div className="mt-4">
                <input type="checkbox" required /> I agree with swop Minting
                <span className="text-[#8A2BE2] underline ml-1">
                  Privacy & Policy
                </span>
              </div>

              <PushToMintCollectionButton
                className="w-max mt-4"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Creating..." : "Create Subscription"}
              </PushToMintCollectionButton>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 flex justify-center items-center p-5 mt-6">
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300 w-full max-w-md aspect-[3/4] flex flex-col items-start">
            <div className="w-full aspect-square bg-gray-200 flex items-center justify-center rounded-t-lg mb-4">
              {formData.image ? (
                <Image
                  src={formData.image}
                  width={300}
                  height={300}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-t-lg"
                />
              ) : (
                <p className="text-gray-500">No Image</p>
              )}
            </div>

            <div className="mb-2">
              <p className="text-lg font-bold">Name</p>
              <p className="text-sm text-gray-500">
                {formData.name || "Name will appear here"}
              </p>
            </div>

            <div className="mb-2">
              <p className="text-lg font-bold">Price</p>
              <p className="text-sm text-gray-500">
                {formData.price ? `$${formData.price}` : "Free"}
              </p>
            </div>

            <div className="mb-2">
              <p className="text-lg font-bold">Description</p>
              <p className="text-sm text-gray-500">
                {formData.description || "Description will appear here"}
              </p>
            </div>

            <div className="mb-2">
              <p className="text-lg font-bold">Start Date</p>
              <p className="text-sm text-gray-500">
                {formData.startDate.toDateString()}
              </p>
            </div>

            <div className="mb-2">
              <p className="text-lg font-bold">End Date</p>
              <p className="text-sm text-gray-500">
                {formData.endDate.toDateString()}
              </p>
            </div>

            <div className="mb-2">
              <p className="text-lg font-bold">Royalty Percentage</p>
              <p className="text-sm text-gray-500">
                {formData.royaltyPercentage}%
              </p>
            </div>

            <div className="mt-4 w-full">
              <p className="text-lg font-bold">Benefits</p>
              <ul className="list-disc list-inside text-sm text-gray-500">
                {formData.benefits.length > 0 ? (
                  formData.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))
                ) : (
                  <li>No benefits added</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
      {/* Mint Alert */}

      <MintAlertModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        modelInfo={modelInfo}
      />
    </div>
  );
};

export default CreateSubscription;
