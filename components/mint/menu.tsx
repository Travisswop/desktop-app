'use client';
import PushToMintCollectionButton from '@/components/Button/PushToMintCollectionButton';
import { sendCloudinaryImage } from '@/lib/SendCloudinaryImage';
import { useUser } from '@/lib/UserContext';
import { useDisclosure } from '@nextui-org/react';
import { useSolanaWalletContext } from '@/lib/context/SolanaWalletContext';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { DragEvent, useEffect, useState } from 'react';
import MintAlertModal, { ModelInfo } from './MintAlertModal';
interface FormData {
  name: string;
  nftType: string;
  description: string;
  image: string;
  price: string;
  currency: string;
  addons: string[];
  enableCreditCard: boolean;
  verifyIdentity: boolean;
  limitQuantity: boolean;
  quantity?: number;
  royaltyPercentage: number;
}

const CreateMenu = ({ collectionId }: { collectionId: string }) => {
  const router = useRouter();
  const { isOpen, onOpenChange } = useDisclosure();
  const [modelInfo, setModelInfo] = useState<ModelInfo>({
    success: false,
    nftType: '',
    details: '',
  });

  const [formData, setFormData] = useState<FormData>({
    name: '',
    nftType: 'menu',
    description: '',
    image: '',
    price: '',
    currency: 'usdc',
    addons: [],
    enableCreditCard: false,
    verifyIdentity: false,
    limitQuantity: false,
    quantity: undefined,
    royaltyPercentage: 10,
  });

  const [newAddon, setNewAddon] = useState('');
  const [selectedImageName, setSelectedImageName] = useState<
    string | null
  >(null);
  const [imageUploading, setImageUploading] = useState(false);
  const { user, accessToken } = useUser();
  const { solanaWallets } = useSolanaWalletContext();
  const [waitForToken, setWaitForToken] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Manage submission state
  const [formErrors, setFormErrors] = useState<
    Record<string, string>
  >({});
  const [imageError, setImageError] = useState<string | null>(null);
  const [walletLoaded, setWalletLoaded] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(
    null
  );
  const [checked, setChecked] = useState(false);

  const wallets = solanaWallets;

  useEffect(() => {
    if (wallets && wallets.length > 0) {
      setSolanaAddress(wallets[0]?.address || null);
      setWalletLoaded(true);
      console.log('Solana wallet detected:', wallets[0]?.address);
    } else {
      setWalletLoaded(true);
      console.log('No Solana wallet detected');
    }
  }, [wallets]);

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

    setFormErrors((prev) => ({ ...prev, [name]: '' }));

    if (type === 'checkbox') {
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

  const handleQuantityChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseInt(e.target.value, 10);

    setFormErrors((prev) => ({ ...prev, quantity: '' }));

    setFormData((prevState) => ({
      ...prevState,
      quantity: isNaN(value) ? undefined : value,
    }));
  };

  const processImage = async (file: File) => {
    setImageError(null);

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setImageError(
        'Invalid file type. Please upload JPEG, JPG, or PNG.'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('File size exceeds 5MB limit.');
      return;
    }

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
        setFormErrors((prev) => ({ ...prev, image: '' }));
      } catch (error) {
        console.error('Error uploading image:', error);
        setImageError('Failed to upload image. Please try again.');
        setFormErrors((prev) => ({
          ...prev,
          image: 'Failed to upload image',
        }));
      } finally {
        setImageUploading(false);
      }
    };

    reader.onerror = () => {
      setImageError('Error reading file. Please try again.');
      setImageUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processImage(file);
  };

  const handleImageDrop = async (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await processImage(file);
  };

  const handleAddAddon = () => {
    if (newAddon.trim()) {
      setFormData((prevState) => ({
        ...prevState,
        addons: [...prevState.addons, newAddon.trim()],
      }));
      setNewAddon('');
      setFormErrors((prev) => ({ ...prev, addons: '' }));
    }
  };

  const handleRemoveAddon = (index: number) => {
    setFormData((prevState) => ({
      ...prevState,
      addons: prevState.addons.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.description.trim())
      errors.description = 'Description is required';
    if (!formData.image) errors.image = 'Image is required';
    if (!formData.price.trim()) errors.price = 'Price is required';

    if (formData.price && isNaN(Number(formData.price))) {
      errors.price = 'Price must be a valid number';
    }

    if (formData.quantity !== undefined) {
      if (formData.quantity <= 0) {
        errors.quantity = 'Quantity must be greater than 0';
      }
    } else {
      errors.quantity = 'Quantity is required';
    }

    if (formData.addons.length === 0) {
      errors.addons = 'At least one add-on is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    // Form validation
    if (!validateForm()) {
      return;
    }

    // Check if wallet is available
    if (!solanaAddress) {
      setModelInfo({
        success: false,
        nftType: formData.nftType,
        details:
          'Solana wallet address not available. Please make sure your wallet is connected.',
      });
      onOpenChange();
      return;
    }

    setIsSubmitting(true);

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
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(finalData),
        }
      );

      const data = await response.json();

      if (response.ok && data.state === 'success') {
        setModelInfo({
          success: true,
          nftType: formData.nftType,
        });
        onOpenChange();

        // Redirect after success
        setTimeout(() => {
          router.push(`/mint/${data?.data?.collectionId}`);
        }, 2000);
      } else {
        // Handle API error response
        setModelInfo({
          success: true,
          nftType: formData.nftType,
          details:
            data.message ||
            'Server returned an error. Please try again later.',
        });
        onOpenChange();
      }
    } catch (error) {
      console.error('Unexpected error:', error);

      // Handle unexpected errors
      setModelInfo({
        success: true,
        nftType: formData.nftType,
        details:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
      });
      onOpenChange();
    } finally {
      setIsSubmitting(false);
    }
  };

  const walletWarning =
    walletLoaded && !solanaAddress ? (
      <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-300 mb-4">
        <p className="text-yellow-800">
          No Solana wallet detected. Please connect your wallet to
          continue.
        </p>
      </div>
    ) : null;

  return (
    <div className="main-container flex justify-center">
      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-300 w-full flex flex-wrap md:flex-nowrap items-start">
        <div className="w-full md:w-1/2 p-5">
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold">Create Menu</h2>
              <label className="-mt-2 block font-normal text-sm text-gray-600">
                <span className="text-red-400"> *</span> Required
                fields
              </label>

              {walletWarning}

              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block font-medium"
                >
                  Name <span className="text-red-400"> *</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Give your menu item a name."
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full border ${
                    formErrors.name
                      ? 'border-red-500'
                      : 'border-gray-300'
                  } rounded-lg px-4 py-2`}
                  required
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.name}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Note: Your menu item name can&apos;t be changed
                  after creation
                </p>
              </div>

              {/* Image Upload */}
              <label htmlFor="image" className="block font-medium">
                Image <span className="text-red-400"> *</span>
              </label>
              <div
                className={`bg-gray-100 p-8 rounded-lg border-2 border-dashed text-center ${
                  formErrors.image || imageError
                    ? 'border-red-500'
                    : 'border-gray-300'
                } h-[255px] -mt-2`}
                style={{ minWidth: '300px', width: '70%' }}
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
                          src={
                            '/assets/mintIcon/image-upload-icon.png'
                          }
                          width={100}
                          height={100}
                          alt="Preview"
                          className="w-[90px] h-auto"
                        />
                      </div>
                      <p className="text-gray-500 my-3 text-sm">
                        Browse or drag and drop an image here . <br />
                        ( JPEG, JPG, PNG )
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
                  <p className="text-sm text-gray-400">
                    Uploading image...
                  </p>
                )}

                {imageError && (
                  <p className="text-sm text-red-500 mt-2">
                    {imageError}
                  </p>
                )}

                {formErrors.image && !imageError && (
                  <p className="text-sm text-red-500 mt-2">
                    {formErrors.image}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-1 block font-medium"
                >
                  Description <span className="text-red-400"> *</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Enter description"
                  value={formData.description}
                  onChange={handleChange}
                  className={`w-full border ${
                    formErrors.description
                      ? 'border-red-500'
                      : 'border-gray-300'
                  } rounded-lg px-4 py-2`}
                  required
                />
                {formErrors.description && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.description}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-1 block font-medium"
                >
                  Price <span className="text-red-400"> *</span>
                </label>
                <div className="flex items-center space-x-4">
                  {' '}
                  <input
                    type="text"
                    id="price"
                    name="price"
                    placeholder="$ 0"
                    value={formData.price}
                    onChange={handleChange}
                    className={`w-full border ${
                      formErrors.price
                        ? 'border-red-500'
                        : 'border-gray-300'
                    } rounded-lg px-4 py-2 flex items-center space-x-4`}
                    required
                  />
                  <div className="w-full border border-gray-300 rounded-lg px-4 py-2 flex items-center space-x-2">
                    <Image
                      src={'/assets/crypto-icons/USDC.png'}
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
                {formErrors.price && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.price}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Note: Currency can&#39;t be changed after creation
                </p>
              </div>

              <div>
                <label htmlFor="price" className="block font-medium">
                  Limit quantity{' '}
                  <span className="text-red-400"> *</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={formData.quantity || ''}
                  onChange={handleQuantityChange}
                  className={`w-full border ${
                    formErrors.quantity
                      ? 'border-red-500'
                      : 'border-gray-300'
                  } rounded-lg px-4 py-2 mt-2`}
                />
                {formErrors.quantity && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.quantity}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Note: Limit the number of times this menu item can
                  be purchased
                </p>
              </div>

              <div>
                <label
                  htmlFor="addons"
                  className="mb-1 block font-medium"
                >
                  Add-ons <span className="text-red-400"> *</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter an add-on"
                  value={newAddon}
                  onChange={(e) => setNewAddon(e.target.value)}
                  className={`w-full border ${
                    formErrors.addons
                      ? 'border-red-500'
                      : 'border-gray-300'
                  } rounded-lg px-4 py-2 mb-2`}
                />
                <button
                  type="button"
                  onClick={handleAddAddon}
                  className="bg-black text-white px-4 py-2 rounded-lg"
                >
                  + Add Add-on
                </button>
                {formErrors.addons && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.addons}
                  </p>
                )}
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

              {/* <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 mt-4">
                <h3 className="text-md font-medium">
                  Enable Pay with Credit Card
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Let users buy this menu item with a credit card.
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
                    onClick={() => alert("Verification process started!")}
                    className="bg-black text-white px-4 py-2 rounded-lg mt-2"
                  >
                    Verify Identity
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
                  Limit the number of times this menu item can be purchased
                </p>
              </div> */}

              {/* Privacy Policy Agreement */}

              <div className="mt-4">
                <input
                  type="checkbox"
                  id="termsAgreement"
                  onChange={() => setChecked(!checked)}
                  checked={checked}
                />{' '}
                I agree with swop Minting
                <span className="text-[#8A2BE2] underline ml-1">
                  Privacy & Policy
                </span>
              </div>

              <PushToMintCollectionButton
                className="w-max mt-4"
                disabled={isSubmitting || !solanaAddress || !checked}
                onClick={handleSubmit}
              >
                {isSubmitting ? 'Creating...' : 'Create Menu'}
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
                {formData.name || 'Name will appear here'}
              </p>
            </div>

            <div className="mb-2">
              <p className="text-lg font-bold">Price</p>
              <p className="text-sm text-gray-500">
                {formData.price ? `$${formData.price}` : 'Free'}
              </p>
            </div>

            <div className="mb-2">
              <p className="text-lg font-bold">Description</p>
              <p className="text-sm text-gray-500">
                {formData.description ||
                  'Description will appear here'}
              </p>
            </div>
            <div className="mt-4 w-full">
              <p className="text-lg font-bold">Add-ons</p>
              <ul className="list-disc list-inside text-sm text-gray-500">
                {formData.addons.length > 0 ? (
                  formData.addons.map((addon, index) => (
                    <li key={index}>{addon}</li>
                  ))
                ) : (
                  <li>No add-ons added</li>
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

export default CreateMenu;
