"use client";
import { useState, DragEvent } from "react";
import PushToMintCollectionButton from "@/components/Button/PushToMintCollectionButton";
import Image from "next/image";
import { sendCloudinaryImage } from "@/lib/SendCloudineryImage";
import { sendCloudinaryFile } from "@/lib/SendCloudineryAnyFile";


interface ContentFile {
  url: string;
  name: string;
  type: string;
}

interface FormData {
  name: string;
  nftType: string;
  description: string;
  image: string;
  price: string;
  recipientAddress: string;
  currency: string;
  benefits: string[];
  content: ContentFile[];
  enableCreditCard: boolean;
  verifyIdentity: boolean;
  limitQuantity: boolean;
  quantity?: number;
}

const CreateCollectiblePage = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    nftType:"collectible",
    description: "",
    image: "",
    price: "",
    recipientAddress: "",
    currency: "usdc",
    benefits: [],
    content: [],
    enableCreditCard: false,
    verifyIdentity: false,
    limitQuantity: false,
    quantity: undefined,
  });

  const [newBenefit, setNewBenefit] = useState("");
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingContent, setUploadingContent] = useState(false);


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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleContentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
  
    try {
      setUploadingContent(true);
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const reader = new FileReader();
          const base64File = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject("Error reading file");
            reader.readAsDataURL(file);
          });
  
          const fileUrl = await sendCloudinaryFile(base64File, file.type, file.name);
          return { url: fileUrl, name: file.name, type: file.type };
        })
      );
  
      // Update the formData with uploaded files
      setFormData((prevState) => ({
        ...prevState,
        content: [...prevState.content, ...uploadedFiles],
      }));
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload some files. Please try again.");
    } finally {
      setUploadingContent(false);
    }
  };
      
  const handleFileDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;
  
    try {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const reader = new FileReader();
          const base64File = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject("Error reading file");
            reader.readAsDataURL(file);
          });
  
          const fileUrl = await sendCloudinaryFile(base64File, file.type, file.name);
          return { url: fileUrl, name: file.name, type: file.type };
        })
      );
  
      setFormData((prevState) => ({
        ...prevState,
        content: [...prevState.content, ...uploadedFiles],
      }));
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload some files. Please try again.");
    }
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

  const getFileTypeIcon = (type: string) => {
    if (type.startsWith("image")) return "🖼️";
    if (type.startsWith("audio")) return "🎵";
    if (type.startsWith("video")) return "🎥";
    if (type === "application/pdf") return "📄";
    return "📁";
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  
    try {
      const storedData = JSON.parse(localStorage.getItem("user-storage") || "{}");
      const accessToken = storedData?.state?.state?.user?.accessToken;
  
      if (!accessToken) {
        alert("Access token not found. Please log in again.");
        return;
      }
  
      // Explicitly convert supplyLimit and price to numbers before submitting
      const finalData = {
        ...formData,
        supplyLimit: Number(formData.quantity), // Ensure it's a number
        price: Number(formData.price), // Ensure it's a number
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
          alert("NFT Template created successfully!");
        } else {
          alert("Failed to create template");
        }
      } else {
        alert("Failed to create template");
      }
    } catch (error) {
      console.error("Error creating template:", error);
      alert("Failed to create template");
    }
  };
  
  return (
    <div className="main-container flex">
      <div className="w-1/2 p-5">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Create Collectible</h2>

            <div>
              <label htmlFor="name" className="mb-1 block font-medium">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Give your digital good a name."
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Note: Your pass name can&#39;t be changed after creation
              </p>
            </div>

            <label htmlFor="image" className="mb-1 block font-medium">
              Image (JPEG, JPG, PNG)
            </label>
            <div
              className="bg-gray-100 p-4 rounded-lg border border-dashed border-gray-300 text-center"
              style={{ minWidth: '300px', width: '50%' }}
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
                    className="rounded-lg object-cover"
                  />
                  <p className="text-sm mt-2 text-gray-700">{selectedImageName}</p>
                  <label
                    htmlFor="image"
                    className="inline-block bg-black text-white px-4 py-2 rounded-lg mt-2 cursor-pointer"
                  >
                    Change Picture
                  </label>
                </div>
              ) : (
                <div>
                  <div className="flex flex-col items-center justify-center h-32 cursor-pointer">
                    <div className="text-6xl text-gray-400">📷</div>
                    <p className="text-gray-500">
                      Browse or drag and drop an image here.
                    </p>
                    <label
                      htmlFor="image"
                      className="inline-block bg-black text-white px-4 py-2 rounded-lg mt-2 cursor-pointer"
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
              {imageUploading && <p>Uploading image...</p>}

            </div>

            <div>
              <label htmlFor="description" className="mb-1 block font-medium">
                Description
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
                Price
              </label>
              <input
                type="text"
                id="price"
                name="price"
                placeholder="Price"
                value={formData.price}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Note: Currency can&#39;t be changed after creation
              </p>
            </div>

            <div
              className={`bg-gray-100 p-4 rounded-lg border ${isDragOver ? "border-blue-500 bg-blue-100" : "border-gray-300"
                }`}
              style={{ minWidth: "300px", width: "50%" }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                handleFileDrop(e);
                setIsDragOver(false);
              }}
            >
              <h3 className="text-lg font-medium text-black-600">Content</h3>
              <p className="text-sm text-gray-600">
                Add content to sell. You can upload images, audio, video, PDFs, or other
                digital files.
              </p>

              {/* File Input for Manual Upload */}
              <input
                type="file"
                id="content"
                name="content"
                multiple
                accept="*/*"
                onChange={handleContentUpload}
                className="w-full border border-dashed border-gray-300 rounded-lg px-4 py-2 mt-2"
              />

              {/* Display Uploaded Files */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                {uploadingContent && <p>Uploading files...</p>}
                {formData.content.map((file, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center p-2 bg-white border rounded shadow-sm w-full"
                  >
                    <div className="text-2xl">{getFileTypeIcon(file.type)}</div>
                    <p className="text-xs text-gray-600 mt-1 text-center truncate w-full overflow-hidden text-ellipsis whitespace-nowrap">
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>            
            
            <div>
              <label htmlFor="benefits" className="mb-1 block font-medium">
                Benefits
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

            <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 mt-4">
              <h3 className="text-md font-medium">Enable Pay with Credit Card</h3>
              <p className="text-sm text-gray-600 mb-2">Let fans buy this pass with a credit card</p>
              <div
                className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer ${formData.enableCreditCard ? "bg-black" : "bg-gray-300"
                  }`}
                onClick={() =>
                  setFormData((prevState) => ({
                    ...prevState,
                    enableCreditCard: !prevState.enableCreditCard,
                  }))
                }
              >
                <div
                  className={`h-6 w-6 bg-white rounded-full shadow-md transform duration-300 ${formData.enableCreditCard ? "translate-x-6" : ""
                    }`}
                ></div>
              </div>

              <div className="mt-4">
                <h3 className="text-md font-medium">Verify Identity</h3>
                <p className="text-sm text-gray-600">Verify your identity to enable credit card payments. You only complete this process once.</p>
                <button
                  type="button"
                  onClick={() => alert("Verification triggered!")}
                  className="bg-black text-white px-4 py-2 rounded-lg mt-2"
                >
                  Verify
                </button>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 mt-4">
              <h3 className="text-md font-medium">Advanced Settings</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium">Limit quantity</span>
                <div
                  className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer ${formData.limitQuantity ? "bg-black" : "bg-gray-300"
                    }`}
                  onClick={() =>
                    setFormData((prevState) => ({
                      ...prevState,
                      limitQuantity: !prevState.limitQuantity,
                    }))
                  }
                >
                  <div
                    className={`h-6 w-6 bg-white rounded-full shadow-md transform duration-300 ${formData.limitQuantity ? "translate-x-6" : ""
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
                Limit the number of times this digital good can be purchased
              </p>
            </div>

            <div className="mt-4">
              <input type="checkbox" required /> I agree with swop Minting Privacy & Policy
            </div>

            <PushToMintCollectionButton className="w-max mt-4" onClick={handleSubmit}>
              Create
            </PushToMintCollectionButton>
          </div>
        </div>
      </div>

      <div className="w-1/2 flex justify-center items-center p-5">
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
            <p className="text-sm text-gray-500">{formData.name || "Name will appear here"}</p>
          </div>

          <div className="mb-2">
            <p className="text-lg font-bold">Price</p>
            <p className="text-sm text-gray-500">{formData.price ? `$${formData.price}` : "Free"}</p>
          </div>

          <div className="mb-2">
            <p className="text-lg font-bold">Description</p>
            <p className="text-sm text-gray-500">{formData.description || "Description will appear here"}</p>
          </div>

          <div className="mt-4 w-full">
            <p className="text-lg font-bold">Benefits</p>
            <ul className="list-disc list-inside text-sm text-gray-500">
              {formData.benefits.length > 0
                ? formData.benefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))
                : <li>No benefits added</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCollectiblePage;