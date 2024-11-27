"use client";
import { useState, useEffect } from "react";
import { usePrivy, useSolanaWallets } from "@privy-io/react-auth";
import PushToMintCollectionButton from "@/components/Button/PushToMintCollectionButton";
import Image from "next/image";

const CreateCollectionPage = () => {
  const [newBenefit, setNewBenefit] = useState("");
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);

  const { ready, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();

  useEffect(() => {
    if (ready && authenticated && wallets.length > 0) {
      const solanaAddress = wallets[0].address;
      setFormData((prevState) => ({
        ...prevState,
        recipientAddress: solanaAddress,
      }));
    }
  }, [ready, authenticated, wallets]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    recipientAddress: "",
    currency: "usdc", // Default to Solana
    benefits: [] as string[], // Change from string to string[]
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
      setSelectedImageName(file.name); // Store the file name in state
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

            <label htmlFor="imageUrl" className="mb-1 block font-medium">
              Image (JPEG, JPG, PNG)
            </label>
            <div
              className="bg-gray-100 p-4 rounded-lg border border-dashed border-gray-300 text-center"
              style={{ minWidth: "300px", width: "50%" }}
              onDragOver={(e) => e.preventDefault()}
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
                  <p className="text-sm mt-2 text-gray-700">{selectedImageName || "No file selected"}</p>
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
                onChange={handleFileChange}
                className="hidden"
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

            <div>
              <label htmlFor="recipientAddress" className="mb-1 block font-medium">
              Recipient&apos;s Solana Address:
              </label>
              <input
                type="text"
                id="recipientAddress"
                name="recipientAddress"
                value={formData.recipientAddress}
                readOnly // Make the field read-only
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-200 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="currency" className="mb-1 block font-medium">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange} // Ensure the onChange handler is attached
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="sol">Solana (SOL)</option>
                <option value="usdc">USD Coin (USDC)</option>
              </select>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 mt-4">
              <div className="">
                <h3 className="text-md font-medium">Verify Identity</h3>
                <p className="text-sm text-gray-600">
                  Verify your identity to enable credit card payments. You only
                  complete this process once.
                </p>
                <button
                  type="button"
                  onClick={() => alert("Verification process started!")}
                  className="bg-black text-white px-4 py-2 rounded-lg mt-2"
                >
                  Verify Identity
                </button>
              </div>
            </div>


            {/* Privacy Policy Agreement */}
            <div className="mt-4">
              <input type="checkbox" required /> I agree with Swop Minting
              Privacy & Policy
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


          {/* Display Description with label */}
          <div className="mb-2">
            <p className="text-lg font-bold">Description</p>
            <p className="text-sm text-gray-500">{formData.description || "Description will appear here"}</p>
          </div>

          {/* Dynamic Benefits Section with label */}
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
  );
};

export default CreateCollectionPage;
