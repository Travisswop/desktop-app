"use client";
import PushToMintCollectionButton from "@/components/Button/PushToMintCollectionButton";
import { sendCloudinaryImage } from "@/lib/SendCloudineryImage";
import { useUser } from "@/lib/UserContext";
import { useDisclosure } from "@nextui-org/react";
import { useSolanaWallets } from "@privy-io/react-auth";
import Image from "next/image";
import { DragEvent, useEffect, useState } from "react";
import { SiSolana } from "react-icons/si";
import MintAlertModal from "./MintAlertModal";

interface FormData {
  name: string;
  nftType: string;
  description: string;
  image: string;
  price: string;
  currency: string;
  benefits: string[];
  requirements: string[];
  enableCreditCard: boolean;
  verifyIdentity: boolean;
  limitQuantity: boolean;
  quantity?: number;
  royaltyPercentage: number;
}

const CreateCoupon = ({ collectionId }: { collectionId: string }) => {
  const { isOpen, onOpenChange } = useDisclosure();
  const [modelInfo, setModelInfo] = useState({
    flag: null,
    title: "",
    description: "",
  });

  const [formData, setFormData] = useState<FormData>({
    name: "",
    nftType: "coupon",
    description: "",
    image: "",
    price: "",
    currency: "usdc",
    benefits: [],
    requirements: [],
    enableCreditCard: false,
    verifyIdentity: false,
    limitQuantity: false,
    quantity: undefined,
    royaltyPercentage: 10,
  });

  const [newBenefit, setNewBenefit] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [selectedImageName, setSelectedImageName] = useState<string | null>(
    null
  );
  const [imageUploading, setImageUploading] = useState(false);
  const { user, accessToken } = useUser();
  const { wallets } = useSolanaWallets();
  const [waitForToken, setWaitForToken] = useState(true);

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
        [name]: (e.target as HTMLInputElement).checked, // Explicitly cast to HTMLInputElement
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
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

  // Handlers for Requirements
  const handleAddRequirement = () => {
    if (newRequirement.trim()) {
      setFormData((prevState) => ({
        ...prevState,
        requirements: [...prevState.requirements, newRequirement.trim()],
      }));
      setNewRequirement("");
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setFormData((prevState) => ({
      ...prevState,
      requirements: prevState.requirements.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    try {
      // Map and prepare final data
      const finalData = {
        ...formData,
        mintLimit: Number(formData.quantity),
        price: Number(formData.price),
        collectionId,
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
          title: "Failed to create template",
          description: "",
        });
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      // alert("An unexpected error occurred. Please try again.");
      onOpenChange(true);
      setModelInfo({
        flag: false,
        title: "Failed to create template",
        description: "",
      });
    }
  };

  return (
    <div className="main-container flex justify-center">
      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-300 w-full flex flex-wrap md:flex-nowrap items-start">
        {/* Form Section */}
        <div className="w-full lg:w-1/2 p-5">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300 h-full flex flex-col">
            <div className="flex flex-col gap-6 flex-grow">
              <h2 className="text-2xl font-bold">Create Coupon</h2>
              <label className="-mt-2 block font-normal text-sm text-gray-600">
                <span className="text-red-400"> *</span> Required fields
              </label>

              {/* Name Input */}
              <div>
                <label htmlFor="name" className="mb-1 block font-medium">
                  Name <span className="text-red-400"> *</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Give your coupon a name."
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Note: Your coupon name can&#39;t be changed after creation
                </p>
              </div>

              {/* Image Upload */}
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

              {/* Description */}
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

              {/* Price */}
              <div>
                <label htmlFor="price" className="mb-1 block font-medium">
                  Price <span className="text-red-400"> *</span>
                </label>
                <div className="flex items-center space-x-4">
                  {" "}
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
                    <SiSolana className="text-gray-900 size-5" />
                    <label htmlFor="price" className="font-medium">
                      Solana
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
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={formData.quantity || ""}
                  onChange={handleQuantityChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Limit the number of times this coupon can be purchased.
                </p>
              </div>

              {/* Add Requirements Section */}
              <div>
                <label
                  htmlFor="requirements"
                  className="mb-1 block font-medium"
                >
                  Requirements <span className="text-red-400"> *</span>
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="Enter a requirement"
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    className="flex-grow border border-gray-300 rounded-lg px-4 py-2 mr-2"
                  />
                  <button
                    type="button"
                    onClick={handleAddRequirement}
                    className="bg-black text-white px-4 py-2 rounded-lg"
                  >
                    + Add
                  </button>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {formData.requirements.map((requirement, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-100 px-4 py-2 rounded-lg shadow-sm"
                    >
                      <span className="text-sm">{requirement}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(index)}
                        className="text-red-500 font-bold"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  {formData.requirements.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No requirements added.
                    </p>
                  )}
                </div>
              </div>

              {/* Add Benefits Section */}
              <div>
                <label htmlFor="benefits" className="mb-1 block font-medium">
                  Benefits <span className="text-red-400"> *</span>
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="Enter a benefit"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    className="flex-grow border border-gray-300 rounded-lg px-4 py-2 mr-2"
                  />
                  <button
                    type="button"
                    onClick={handleAddBenefit}
                    className="bg-black text-white px-4 py-2 rounded-lg"
                  >
                    + Add
                  </button>
                </div>
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
                  {formData.benefits.length === 0 && (
                    <p className="text-sm text-gray-500">No benefits added.</p>
                  )}
                </div>
              </div>

              {/* Enable Credit Card & Verify Identity */}
              {/* <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
                <h3 className="text-md font-medium">
                  Enable Pay with Credit Card
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Let users buy this coupon with a credit card.
                </p>
                <div className="flex items-center justify-between mt-4">
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
                </div>

                <div className="mt-4">
                  <h3 className="text-md font-medium">Verify Identity</h3>
                  <p className="text-sm text-gray-600">
                    Verify your identity to enable credit card payments. You
                    only complete this process once.
                  </p>
                  <button
                    type="button"
                    onClick={() => alert("Verification process started!")}
                    className="bg-black text-white px-4 py-2 rounded-lg mt-2"
                  >
                    Verify Identity
                  </button>
                </div>
              </div> */}

              {/* Advanced Settings */}
              {/* <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
                <h3 className="text-md font-medium">Advanced Settings</h3>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm font-medium">Limit Quantity</span>
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
                  Limit the number of times this coupon can be purchased.
                </p>
              </div> */}

              {/* Privacy Policy Agreement */}

              <div className="mt-4 flex items-center">
                <input type="checkbox" required className="mr-2" />
                <label>
                  I agree with Swop Minting{" "}
                  <span className="text-[#8A2BE2] underline ml-1">
                    Privacy & Policy
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <PushToMintCollectionButton
              className="w-max mt-4"
              onClick={handleSubmit}
            >
              Create
            </PushToMintCollectionButton>
          </div>
        </div>

        {/* Preview Section */}
        <div className="w-full lg:w-1/2 p-5 flex justify-center items-center mt-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300 w-full max-w-md flex flex-col">
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

            {/* Requirements in Preview */}
            <div className="mt-4 w-full">
              <p className="text-lg font-bold">Requirements</p>
              <ul className="list-disc list-inside text-sm text-gray-500">
                {formData.requirements.length > 0 ? (
                  formData.requirements.map((requirement, index) => (
                    <li key={index}>{requirement}</li>
                  ))
                ) : (
                  <li>No requirements added.</li>
                )}
              </ul>
            </div>

            {/* Benefits in Preview */}
            <div className="mt-4 w-full">
              <p className="text-lg font-bold">Benefits</p>
              <ul className="list-disc list-inside text-sm text-gray-500">
                {formData.benefits.length > 0 ? (
                  formData.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))
                ) : (
                  <li>No benefits added.</li>
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

export default CreateCoupon;
