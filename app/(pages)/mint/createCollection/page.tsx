"use client";
import { useState, useEffect, DragEvent } from "react";
import { usePrivy, useSolanaWallets } from "@privy-io/react-auth";
import PushToMintCollectionButton from "@/components/Button/PushToMintCollectionButton";
import Image from "next/image";
import { sendCloudinaryImage } from "@/lib/SendCloudineryImage";
import { useUser } from "@/lib/UserContext";


const CreateCollectionPage = () => {
  const [newBenefit, setNewBenefit] = useState("");
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [waitForToken, setWaitForToken] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const { accessToken } = useUser();

  const { ready, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();
  const [solanaAddress, setSolanaAddress] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    recipientAddress: "",
    currency: "usdc", // Default to Solana
    // benefits: [] as string[], // Change from string to string[]
  });

  useEffect(() => {
    if (
      ready &&
      authenticated &&
      wallets.length > 0 &&
      formData.recipientAddress !== wallets[0].address
    ) {
      setSolanaAddress(wallets[0].address);
      setFormData((prevState) => ({
        ...prevState,
        recipientAddress: solanaAddress,
      }));
    }
  }, [ready, authenticated, wallets, formData.recipientAddress]);
  
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
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Handle file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
    }
  };
  

  // const handleAddBenefit = () => {
  //   if (newBenefit.trim()) {
  //     setFormData((prevState) => ({
  //       ...prevState,
  //       benefits: [...prevState.benefits, newBenefit.trim()],
  //     }));
  //     setNewBenefit("");
  //   }
  // };

  // const handleRemoveBenefit = (index: number) => {
  //   setFormData((prevState) => ({
  //     ...prevState,
  //     benefits: prevState.benefits.filter((_, i) => i !== index),
  //   }));
  // };

  const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
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
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionError(null);

    if (!accessToken && !waitForToken) {
      alert("Access token is required. Please log in again.");
      return;
    }

    if (!accessToken && waitForToken) {
      alert("Waiting for access token. Please try again shortly.");
      return;
    }
    
    if (!accessToken) {
      alert("Access token is required. Please log in again.");
      return;
    }    
      
    if (!solanaAddress) {
      alert("No Solana wallet connected. Please connect your wallet.");
      return;
    }      


    const payload = {
      chain: "solana",
      metadata: {
        name: formData.name,
        image: formData.image,
        description: formData.description,
      },
      reuploadLinkedFiles: true,
      payments: {
        recipientAddress: formData.recipientAddress,
        currency: formData.currency,
        price: "1.00",
      },
      subscription: {
        enabled: false,
      },
      transferable: true,
      fungibility: "non-fungible",
    };

    try {
      const response = await fetch("http://localhost:4000/api/v1/desktop/nft/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Collection created successfully:", data);
      // Optionally, reset form or redirect user
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
        setSubmissionError(error.message);
      } else {
        console.error('An unexpected error occurred:', error);
        setSubmissionError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
    
  };

  return (
    <form onSubmit={handleSubmit}>
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

              <label htmlFor="image" className="mb-1 block font-medium">
                Image (JPEG, JPG, PNG)
              </label>
              <div
                className="bg-gray-100 p-4 rounded-lg border border-dashed border-gray-300 text-center"
                style={{ minWidth: "300px", width: "50%" }}
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
                  onChange={handleFileChange}
                  className="hidden"
                />
                {imageUploading && <p>Uploading image...</p>}

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
              {/* <div>
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
              </div> */}

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

              <PushToMintCollectionButton className="w-max" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Collection"}
              </PushToMintCollectionButton>
              {submissionError && <p className="text-red-500 mt-2">{submissionError}</p>}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-1/2 flex justify-center items-center p-5">
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300 w-full max-w-md aspect-[3/4] flex flex-col items-start">
            {/* Display dynamic Image as a square */}
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
            {/* <div className="mt-4 w-full">
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
            </div> */}

          </div>
        </div>
      </div>
    </form>
  );
};

export default CreateCollectionPage;
