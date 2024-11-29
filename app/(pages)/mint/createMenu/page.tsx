"use client";
import { useState, DragEvent } from "react";
import PushToMintCollectionButton from "@/components/Button/PushToMintCollectionButton";
import Image from "next/image";
import { sendCloudinaryImage } from "@/lib/SendCloudineryImage";


interface FormData {
  name: string;
  nftType: string;
  description: string;
  image: string;
  price: string;
  recipientAddress: string;
  currency: string;
  addons: string[];
  enableCreditCard: boolean;
  verifyIdentity: boolean;
  limitQuantity: boolean;
  quantity?: number;
}

const CreateMenuPage = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    nftType: "menu",
    description: "",
    image: "",
    price: "",
    recipientAddress: "",
    currency: "usdc",
    addons: [],
    enableCreditCard: false,
    verifyIdentity: false,
    limitQuantity: false,
    quantity: undefined,
  });

  const [newAddon, setNewAddon] = useState("");
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);


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

  const handleAddAddon = () => {
    if (newAddon.trim()) {
      setFormData((prevState) => ({
        ...prevState,
        addons: [...prevState.addons, newAddon.trim()],
      }));
      setNewAddon("");
    }
  };


  const handleRemoveAddon = (index: number) => {
    setFormData((prevState) => ({
      ...prevState,
      addons: prevState.addons.filter((_, i) => i !== index),
    }));
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

      // Map and prepare final data
      const finalData = {
        ...formData,
        supplyLimit: formData.limitQuantity ? Number(formData.quantity) : undefined,
        price: Number(formData.price), // Ensure price is a number
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
          alert("Subscription created successfully!");
        } else {
          alert(data.message || "Failed to create subscription.");
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to create subscription.");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="main-container flex">
      <div className="w-1/2 p-5">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Create Menu</h2>

            <div>
              <label htmlFor="name" className="mb-1 block font-medium">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Give your menu item a name."
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Note: Your menu item name can&apos;t be changed after creation
              </p>
            </div>

            {/* Image Upload */}
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
                Note: Currency can&apos;t be changed after creation
              </p>
            </div>

            <div>
              <label htmlFor="addons" className="mb-1 block font-medium">
                Add-ons
              </label>
              <input
                type="text"
                placeholder="Enter an add-on"
                value={newAddon}
                onChange={(e) => setNewAddon(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-2"
              />
              <button
                type="button"
                onClick={handleAddAddon}
                className="bg-black text-white px-4 py-2 rounded-lg"
              >
                + Add Add-on
              </button>
              <div className="flex flex-col gap-2 mt-2">
                {formData.addons.map((addon, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-100 px-4 py-2 rounded-lg shadow-sm"
                  >
                    <span className="text-sm">{addon}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAddon(index)}
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
              <p className="text-sm text-gray-600 mb-2">
                Let users buy this menu item with a credit card.
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
                  Verify your identity to enable credit card payments. You only complete
                  this process once.
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
                Limit the number of times this menu item can be purchased
              </p>
            </div>

            {/* Privacy Policy Agreement */}
            <div className="mt-4">
              <input type="checkbox" required /> I agree with Swop Minting
              Privacy & Policy
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
            <p className="text-lg font-bold">Add-ons</p>
            <ul className="list-disc list-inside text-sm text-gray-500">
              {formData.addons.length > 0
                ? formData.addons.map((addon, index) => (
                  <li key={index}>{addon}</li>
                ))
                : <li>No add-ons added</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateMenuPage;