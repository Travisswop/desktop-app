"use client";
import { useState } from "react";
import PushToMintCollectionButton from "@/components/Button/PushToMintCollectionButton";
import Image from "next/image";

const CreateCollectionPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    recipientAddress: "",
    currency: "sol", // Default to Solana
    benefits: "", // Benefits input
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prevState) => ({
          ...prevState,
          imageUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="main-container flex">
      {/* Left Column */}
      <div className="w-1/2 p-5">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Create New Collection</h2>

            <div>
              <label htmlFor="name" className="mb-1 block font-medium">
                Name:
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Collection Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block font-medium">
                Description:
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Collection Description"
                value={formData.description}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              />
            </div>

            {/* Benefits Input */}
            <div>
              <label htmlFor="benefits" className="mb-1 block font-medium">
                Benefits:
              </label>
              <textarea
                id="benefits"
                name="benefits"
                placeholder="Enter each benefit on a new line"
                value={formData.benefits}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label htmlFor="imageUrl" className="mb-1 block font-medium">
                Image:
              </label>
              <input
                type="file"
                id="imageUrl"
                name="imageUrl"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label htmlFor="price" className="mb-1 block font-medium">
                Price in USD:
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
            </div>

            <div>
              <label
                htmlFor="recipientAddress"
                className="mb-1 block font-medium"
              >
                Recipient&apos;s Solana Address:
              </label>
              <input
                type="text"
                id="recipientAddress"
                name="recipientAddress"
                placeholder="Recipient Address"
                value={formData.recipientAddress}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              />
            </div>

            <div>
              <label htmlFor="currency" className="mb-1 block font-medium">
                Currency:
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              >
                <option value="sol">Solana (SOL)</option>
                {/* Add other options if needed */}
              </select>
            </div>

            <PushToMintCollectionButton className="w-max">
              Create Collection
            </PushToMintCollectionButton>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="w-1/2 flex justify-center items-center p-5">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300 w-full max-w-md aspect-[3/4] flex flex-col items-start">
          {/* Display dynamic Image as a square */}
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

          {/* Display Name with label */}
          <div className="mb-2">
            <p className="text-lg font-bold">Name</p>
            <p className="text-sm text-gray-500">{formData.name || "Name will appear here"}</p>
          </div>

          {/* Display Price with label */}
          <div className="mb-2">
            <p className="text-lg font-bold">Price</p>
            <p className="text-sm text-gray-500">{formData.price ? `$${formData.price}` : "Free"}</p>
          </div>

          {/* Display Description with label */}
          <div className="mb-2">
            <p className="text-lg font-bold">Description</p>
            <p className="text-sm text-gray-500">{formData.description || "Description will appear here"}</p>
          </div>

          {/* Dynamic Benefits Section with label */}
          <div className="mt-4 w-full">
            <p className="text-lg font-bold">Benefits</p>
            <ul className="list-disc list-inside text-sm text-gray-500">
              {formData.benefits
                ? formData.benefits.split("\n").map((benefit, index) => (
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

export default CreateCollectionPage;
