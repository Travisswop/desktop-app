"use client";
import { useState, DragEvent } from "react";
import PushToMintCollectionButton from "@/components/Button/PushToMintCollectionButton";
import Image from "next/image";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface ContentFile {
  url: string;
  name: string;
  type: string;
}

interface FormData {
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  recipientAddress: string;
  currency: string;
  benefits: string[];
  content: ContentFile[];
  enableCreditCard: boolean;
  verifyIdentity: boolean;
  limitQuantity: boolean;
  quantity?: number;
  royaltyPercentage: number;
  startDate: Date;
  endDate: Date;
}

const CreateSubscriptionPage = () => {
  const today = new Date();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    recipientAddress: "",
    currency: "usdc",
    benefits: [],
    content: [],
    enableCreditCard: false,
    verifyIdentity: false,
    limitQuantity: false,
    quantity: undefined,
    royaltyPercentage: 10, // Default royalty percentage
    startDate: today,
    endDate: new Date(today),
  });

  const [newBenefit, setNewBenefit] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedImageName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prevState) => ({
        ...prevState,
        imageUrl: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    setSelectedImageName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prevState) => ({
        ...prevState,
        imageUrl: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleContentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const uploadedFiles = files.map((file) => {
      const reader = new FileReader();
      return new Promise<ContentFile | null>((resolve) => {
        reader.onloadend = () => {
          resolve({ url: reader.result as string, name: file.name, type: file.type });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(uploadedFiles).then((successfulUploads) => {
      setFormData((prevState) => ({
        ...prevState,
        content: [...prevState.content, ...(successfulUploads.filter(Boolean) as ContentFile[])],
      }));
    });
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

  return (
    <div className="main-container flex">
      <div className="w-1/2 p-5">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Create Subscription</h2>

            <div>
              <label htmlFor="name" className="mb-1 block font-medium">
                Name
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
                Note: Your subscription name can&apos;t be changed after creation
              </p>
            </div>

            <label htmlFor="imageUrl" className="mb-1 block font-medium">
              Image (JPEG, JPG, PNG)
            </label>
            <div
              className="bg-gray-100 p-4 rounded-lg border border-dashed border-gray-300 text-center"
              style={{ minWidth: '300px', width: '50%' }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleImageDrop}
            >
              {formData.imageUrl ? (
                <div className="flex flex-col items-center">
                  <Image
                    src={formData.imageUrl}
                    width={100}
                    height={100}
                    alt="Preview"
                    className="rounded-lg object-cover"
                  />
                  <p className="text-sm mt-2 text-gray-700">{selectedImageName}</p>
                  <label
                    htmlFor="imageUrl"
                    className="inline-block bg-black text-white px-4 py-2 rounded-lg mt-2 cursor-pointer"
                  >
                    Change Picture
                  </label>
                </div>
              ) : (
                <div>
                  <div className="flex flex-col items-center justify-center h-32 cursor-pointer">
                    <div className="text-6xl text-gray-400">📷</div>
                    <p className="text-gray-500">Browse or drag and drop an image here.</p>
                    <label
                      htmlFor="imageUrl"
                      className="inline-block bg-black text-white px-4 py-2 rounded-lg mt-2 cursor-pointer"
                    >
                      Browse
                    </label>
                  </div>
                </div>
              )}
              <input
                type="file"
                id="imageUrl"
                name="imageUrl"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
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
                Note: Currency can&apos;t be changed after creation
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="startDate" className="mb-1 block font-medium">
                  Start Date
                </label>
                <DatePicker
                  selected={formData.startDate}
                  onChange={(date) => handleDateChange(date as Date, "startDate")}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  dateFormat="yyyy-MM-dd"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="duration" className="mb-1 block font-medium">
                  Duration
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

            <div
              className="bg-gray-100 p-4 rounded-lg border border-gray-300"
              style={{ minWidth: '300px', width: '50%' }}
            >
              <h3 className="text-lg font-medium text-black-600">Content</h3>
              <p className="text-sm text-gray-600">
                Add content to sell. You can upload images, audio, video, PDFs, or other digital files.
              </p>
              <input
                type="file"
                id="content"
                name="content"
                multiple
                accept="*/*"
                onChange={handleContentUpload}
                className="w-full border border-dashed border-gray-300 rounded-lg px-4 py-2 mt-2"
              />

              <div className="grid grid-cols-3 gap-4 mt-4">
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

            <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 mt-4">
              <h3 className="text-md font-medium">Enable Pay with Credit Card</h3>
              <p className="text-sm text-gray-600 mb-2">
                Let users buy this subscription with a credit card.
              </p>
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
                <p className="text-sm text-gray-600">
                  Verify your identity to enable credit card payments. You only complete this process once.
                </p>
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
                Limit the number of times this digital good can be purchased.
              </p>

              <div className="mt-4">
                <label htmlFor="royaltyPercentage" className="block font-medium mb-1">
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
            </div>

            <div className="mt-4">
              <input type="checkbox" required /> I agree with swop Minting Privacy & Policy
            </div>

            <PushToMintCollectionButton className="w-max mt-4">
              Create
            </PushToMintCollectionButton>
          </div>
        </div>
      </div>

      <div className="w-1/2 flex justify-center items-center p-5">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300 w-full max-w-md aspect-[3/4] flex flex-col items-start">
          <div className="w-full aspect-square bg-gray-200 flex items-center justify-center rounded-t-lg mb-4">
            {formData.imageUrl ? (
              <Image
                src={formData.imageUrl}
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

          <div className="mb-2">
            <p className="text-lg font-bold">Start Date</p>
            <p className="text-sm text-gray-500">{formData.startDate.toDateString()}</p>
          </div>

          <div className="mb-2">
            <p className="text-lg font-bold">End Date</p>
            <p className="text-sm text-gray-500">{formData.endDate.toDateString()}</p>
          </div>

          <div className="mb-2">
            <p className="text-lg font-bold">Royalty Percentage</p>
            <p className="text-sm text-gray-500">{formData.royaltyPercentage}%</p>
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

export default CreateSubscriptionPage;
