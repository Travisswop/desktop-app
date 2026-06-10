'use client';

import { sendCloudinaryImage } from '@/lib/SendCloudinaryImage';
import { useUser } from '@/lib/UserContext';
import { useDisclosure } from '@nextui-org/react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  DragEvent,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import {
  Box,
  FileText,
  ImagePlus,
  Loader2,
  Lock,
  UploadCloud,
  X,
} from 'lucide-react';
import MintAlertModal from './MintAlertModal';
import {
  Button,
  Card,
  Field,
  FormSection,
  ScreenShell,
  TextArea,
  TextInput,
  fieldLabel,
  ghostBtn,
  hair,
  ink,
  inputStyle,
  mono,
  muted,
  muted2,
  primaryBtn,
} from './design-system';
import {
  completeAgentActionFromHandoff,
  getMarketplaceProductPrefill,
  readAgentActionHandoff,
} from '@/lib/chat/agentActionHandoff';
import {
  createMarketplaceProduct,
  getMarketplaceProduct,
  updateMarketplaceProduct,
  uploadMarketplaceDigitalAsset,
  type MarketplaceDigitalAsset,
} from '@/lib/marketplace-api';

interface ModelInfo {
  success: boolean;
  nftType: string;
  details?: string;
  successTitle?: string;
  errorTitle?: string;
}

interface VariantOption {
  name: string;
  quantity: string;
}

interface Variant {
  name: string;
  options: VariantOption[];
}

const formatFileSize = (bytes?: number) => {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 KB';
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const PAYOUT_TOKEN_OPTIONS: {
  code: string;
  label: string;
  badge: string;
  color: string;
}[] = [
  { code: 'USDC', label: 'USDC', badge: '$', color: '#2775CA' },
  { code: 'XAUT', label: 'Tether Gold (Solana)', badge: 'Au', color: '#C9A227' },
  { code: 'ETH', label: 'Ethereum (ETH)', badge: 'Ξ', color: '#627EEA' },
  { code: 'SOL', label: 'Solana (SOL)', badge: '◎', color: '#14F195' },
];

const CreateProduct = ({ productId }: { productId?: string } = {}) => {
  const router = useRouter();
  const { isOpen, onOpenChange } = useDisclosure();
  const { user, accessToken } = useUser();
  const { ready, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();

  const isEditMode = Boolean(productId);
  const [loadingProduct, setLoadingProduct] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [type, setType] = useState<'Physical' | 'Digital'>('Physical');

  const [shipping, setShipping] = useState<'Yes' | 'No'>('Yes');
  const [shippingCost, setShippingCost] = useState('');
  const [agree, setAgree] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [extraImages, setExtraImages] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [price, setPrice] = useState('');
  const [payoutToken, setPayoutToken] = useState('USDC');
  const [quantity, setQuantity] = useState<string>('');
  const [variants, setVariants] = useState<Variant[]>([
    { name: '', options: [] },
  ]);
  const [variantDraft, setVariantDraft] = useState<string[]>([]);

  const [selectedImageName, setSelectedImageName] = useState<string | null>(
    null
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [digitalAsset, setDigitalAsset] =
    useState<MarketplaceDigitalAsset | null>(null);
  const [digitalUploading, setDigitalUploading] = useState(false);
  const [digitalUploadError, setDigitalUploadError] = useState<string | null>(
    null
  );
  const [digitalDeliveryNote, setDigitalDeliveryNote] = useState('');

  const [walletLoaded, setWalletLoaded] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modelInfo, setModelInfo] = useState<ModelInfo>({
    success: false,
    nftType: '',
    details: '',
  });
  const [agentProposalId, setAgentProposalId] = useState<string | null>(null);

  useEffect(() => {
    if (ready && authenticated) {
      if (wallets && wallets.length > 0) {
        setSolanaAddress(wallets[0]?.address || null);
      }
      setWalletLoaded(true);
    }
  }, [ready, authenticated, wallets]);

  useEffect(() => {
    if (isEditMode) return;
    const handoff = readAgentActionHandoff();
    const prefill = getMarketplaceProductPrefill(handoff);
    if (!prefill?.proposalId) return;

    setAgentProposalId(prefill.proposalId);
    if (prefill.category) {
      setType(prefill.category === 'physical' ? 'Physical' : 'Digital');
    }
    if (prefill.name) setName(prefill.name);
    if (prefill.description) setDescription(prefill.description);
    if (prefill.description) setDigitalDeliveryNote(prefill.description);
    if (prefill.image) setImage(prefill.image);
    if (prefill.price) setPrice(prefill.price);
    if (prefill.mintLimit) setQuantity(prefill.mintLimit);
    if (prefill.benefits?.length) {
      setVariants([
        {
          name: 'Included',
          options: prefill.benefits.map((benefit) => ({
            name: benefit,
            quantity: '0',
          })),
        },
      ]);
    }
  }, [isEditMode]);

  // Edit mode: load the existing product and prefill every field.
  useEffect(() => {
    if (!productId || !accessToken) return;
    let cancelled = false;
    setLoadingProduct(true);
    setLoadError(null);
    getMarketplaceProduct(accessToken, productId)
      .then((product) => {
        if (cancelled) return;
        setType(product.productType === 'digital' ? 'Digital' : 'Physical');
        setName(product.title || '');
        setDescription(product.description || '');
        const primary = product.primaryImage || product.images?.[0]?.url || '';
        setImage(primary);
        const extras = (product.images || [])
          .map((img) => img.url)
          .filter((url): url is string => Boolean(url) && url !== primary);
        setExtraImages([
          extras[0] ?? null,
          extras[1] ?? null,
          extras[2] ?? null,
          extras[3] ?? null,
        ]);
        setPrice(
          product.price?.amount != null ? String(product.price.amount) : ''
        );
        if (product.payoutToken) {
          setPayoutToken(String(product.payoutToken).toUpperCase());
        }
        const available = product.inventory?.available;
        setQuantity(available != null ? String(available) : '');
        if (product.variants?.length) {
          setVariants(
            product.variants.map((variant) => ({
              name: variant.name || '',
              options: (variant.options || []).map((option) => ({
                name: option.name || '',
                quantity:
                  option.quantity != null ? String(option.quantity) : '',
              })),
            }))
          );
        }
        const requiresShipping = product.fulfillment?.requiresShipping;
        setShipping(requiresShipping ? 'Yes' : 'No');
        if (product.fulfillment?.shippingCost != null) {
          setShippingCost(String(product.fulfillment.shippingCost));
        }
        if (product.fulfillment?.digitalAsset) {
          setDigitalAsset(product.fulfillment.digitalAsset);
        }
        if (product.fulfillment?.digitalDeliveryNote) {
          setDigitalDeliveryNote(product.fulfillment.digitalDeliveryNote);
        }
        // Agreement was accepted at creation — don't re-gate edits on it.
        setAgree(true);
        setLoadingProduct(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load this product.'
        );
        setLoadingProduct(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, accessToken]);

  const processImage = async (
    file: File,
    setUrl: (url: string) => void,
    rememberName?: boolean
  ) => {
    setImageError(null);

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setImageError('Invalid file type. Please upload JPEG, JPG, or PNG.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setImageError('File size exceeds 8MB limit.');
      return;
    }

    if (rememberName) setSelectedImageName(file.name);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        setImageUploading(true);
        const url = await sendCloudinaryImage(base64);
        setUrl(url);
        setFormErrors((prev) => ({ ...prev, image: '' }));
      } catch (err) {
        console.error('Error uploading image:', err);
        setImageError('Failed to upload image. Please try again.');
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

  const handleMainImageDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file, setImage, true);
  };

  const handleMainImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file, setImage, true);
  };

  const handleExtraImagePick =
    (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      processImage(file, (url) =>
        setExtraImages((prev) => {
          const next = [...prev];
          next[idx] = url;
          return next;
        })
      );
    };

  const handleDigitalAssetPick = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!accessToken) {
      setDigitalUploadError('Please log in again before uploading a file.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setDigitalUploadError('Digital downloads must be 100MB or smaller.');
      return;
    }

    setDigitalUploading(true);
    setDigitalUploadError(null);
    try {
      const uploaded = await uploadMarketplaceDigitalAsset(accessToken, file);
      setDigitalAsset(uploaded);
      setFormErrors((prev) => ({ ...prev, digitalAsset: '' }));
    } catch (err) {
      setDigitalUploadError(
        err instanceof Error
          ? err.message
          : 'Failed to upload digital file. Please try again.'
      );
    } finally {
      setDigitalUploading(false);
    }
  };

  const updateVariantName = (i: number, value: string) =>
    setVariants((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], name: value };
      return next;
    });

  const addVariantOption = (i: number, value: string) => {
    const v = value.trim();
    if (!v) return;
    setVariants((prev) => {
      const next = [...prev];
      next[i] = {
        ...next[i],
        options: [...next[i].options, { name: v, quantity: '' }],
      };
      return next;
    });
    setVariantDraft((prev) => {
      const next = [...prev];
      next[i] = '';
      return next;
    });
  };

  const updateVariantOptionQuantity = (
    i: number,
    optIdx: number,
    value: string
  ) =>
    setVariants((prev) => {
      const next = [...prev];
      next[i] = {
        ...next[i],
        options: next[i].options.map((option, oi) =>
          oi === optIdx ? { ...option, quantity: value } : option
        ),
      };
      return next;
    });

  const removeVariantOption = (i: number, optIdx: number) =>
    setVariants((prev) => {
      const next = [...prev];
      next[i] = {
        ...next[i],
        options: next[i].options.filter((_, oi) => oi !== optIdx),
      };
      return next;
    });

  const addVariantCategory = () =>
    setVariants((prev) => [...prev, { name: '', options: [] }]);

  const variantInventoryTotal = useMemo(
    () =>
      variants.reduce(
        (sum, v) =>
          sum +
          v.options.reduce((inner, option) => {
            const qty = Number(option.quantity);
            return inner + (Number.isFinite(qty) && qty > 0 ? qty : 0);
          }, 0),
        0
      ),
    [variants]
  );
  // The main "Total Available" is driven by variant inventory only once the
  // seller actually enters a quantity on an option. Simply naming an option no
  // longer locks the field, so a plain product (with no per-option stock) can
  // still type a total directly.
  const hasVariantInventory = useMemo(
    () =>
      variants.some((v) =>
        v.options.some((option) => option.quantity.trim() !== '')
      ),
    [variants]
  );
  const normalizedVariants = useMemo(
    () =>
      variants
        .map((variant) => ({
          name: variant.name.trim(),
          options: variant.options
            .map((option) => ({
              name: option.name.trim(),
              quantity: Math.max(0, Math.floor(Number(option.quantity) || 0)),
            }))
            .filter((option) => option.name),
        }))
        .filter((variant) => variant.name || variant.options.length > 0),
    [variants]
  );

  const activePayoutToken =
    PAYOUT_TOKEN_OPTIONS.find((c) => c.code === payoutToken) ??
    PAYOUT_TOKEN_OPTIONS[0];

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!description.trim()) errors.description = 'Description is required';
    if (!image) errors.image = 'Main image is required';
    if (!price.trim()) errors.price = 'Price is required';
    if (price && isNaN(Number(price))) errors.price = 'Price must be a number';
    if (type === 'Physical' && shipping === 'Yes') {
      if (!shippingCost.trim()) {
        errors.shippingCost = 'Enter a shipping cost (use 0 for free shipping)';
      } else if (isNaN(Number(shippingCost)) || Number(shippingCost) < 0) {
        errors.shippingCost = 'Shipping cost must be 0 or a positive number';
      }
    }
    if (hasVariantInventory) {
      const invalidVariantQty = variants.some((variant) =>
        variant.options.some((option) => {
          const qty = Number(option.quantity);
          return !Number.isFinite(qty) || qty < 0 || !option.quantity.trim();
        })
      );
      if (invalidVariantQty) {
        errors.quantity = 'Every variant option needs a quantity';
      } else if (variantInventoryTotal <= 0) {
        errors.quantity = 'Variant quantities must add up to more than 0';
      }
    } else if (!quantity.trim()) {
      errors.quantity = 'Total available is required';
    } else if (Number(quantity) <= 0) {
      errors.quantity = 'Must be greater than 0';
    }
    if (type === 'Digital' && !digitalAsset?.enabled) {
      errors.digitalAsset = 'Upload the file buyers will unlock after purchase';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!user?._id || !accessToken) {
      setModelInfo({
        success: false,
        nftType: type.toLowerCase(),
        details: 'Please log in again before publishing this item.',
      });
      onOpenChange();
      return;
    }

    if (!isEditMode && !solanaAddress) {
      setModelInfo({
        success: false,
        nftType: type.toLowerCase(),
        details:
          'Solana wallet address not available. Please make sure your wallet is connected.',
      });
      onOpenChange();
      return;
    }

    setIsSubmitting(true);
    try {
      const productType = type === 'Physical' ? 'physical' : 'digital';
      const inventoryAvailable = hasVariantInventory
        ? variantInventoryTotal
        : Number(quantity);
      const payload = {
        productType,
        title: name,
        description,
        primaryImage: image,
        images: [image, ...extraImages.filter(Boolean)].map((url) => ({
          url,
          alt: name,
        })),
        price: {
          // US dollar pricing; USDC is the dollar settlement token the
          // checkout rails quote against. Buyers can pay with any token.
          amount: Number(price),
          currency: 'USDC',
        },
        payoutToken,
        inventory: {
          track: true,
          available: inventoryAvailable,
        },
        variants: normalizedVariants,
        fulfillment: {
          requiresShipping: productType === 'physical' && shipping === 'Yes',
          trackingEnabled: productType === 'physical' && shipping === 'Yes',
          shippingCost:
            productType === 'physical' && shipping === 'Yes'
              ? Number(shippingCost) || 0
              : 0,
          digitalDeliveryNote:
            productType === 'digital'
              ? digitalDeliveryNote.trim() || description
              : '',
          digitalAsset: productType === 'digital' ? digitalAsset : undefined,
        },
        merchantWalletAddress: solanaAddress,
        tags: variants
          .flatMap((v) =>
            v.options.map((o) =>
              v.name ? `${v.name}: ${o.name}` : o.name
            )
          )
          .filter(Boolean),
      };
      const product =
        isEditMode && productId
          ? await updateMarketplaceProduct(accessToken, productId, payload)
          : await createMarketplaceProduct(accessToken, payload);

      let completion = null;
      if (agentProposalId) {
        try {
          completion = await completeAgentActionFromHandoff(
            {
              proposalId: agentProposalId,
              provider: 'marketplace',
              status: 'executed',
              title: 'Product published',
              subject: name,
              stake: Number(price) || undefined,
              payout: Number(price) || undefined,
              orderId: product._id,
              explorerLabel: 'View product',
              executionResult: {
                productId: product._id,
                name,
                productType,
                price: Number(price),
                inventoryAvailable,
                receiptMinting: 'order_receipt_only',
              },
            },
            accessToken
          );
        } catch (completionError) {
          console.error(
            'Failed to record marketplace agent completion:',
            completionError
          );
        }
      }

      setModelInfo({
        success: true,
        nftType: productType,
        successTitle: isEditMode ? 'Product updated' : undefined,
      });
      onOpenChange();
      setTimeout(() => {
        if (completion?.groupId) {
          router.push(
            `/dashboard/chat?groupId=${encodeURIComponent(completion.groupId)}`
          );
        } else {
          router.push('/products');
        }
      }, 2000);
    } catch (err) {
      console.error(err);
      setModelInfo({
        success: false,
        nftType: type === 'Physical' ? 'physical' : 'digital',
        errorTitle: isEditMode ? 'Failed to update product' : undefined,
        details:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred. Please try again.',
      });
      onOpenChange();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode && loadError) {
    return (
      <main className="main-container">
        <div
          style={{
            background: '#f4f4f2',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 40,
          }}
        >
          <Card>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                alignItems: 'flex-start',
                maxWidth: 360,
              }}
            >
              <div
                style={{ fontSize: 13, color: '#b91c1c', fontWeight: 600 }}
              >
                {loadError}
              </div>
              <Button variant="ghost" onClick={() => router.push('/products')}>
                Back to products
              </Button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  if ((isEditMode && loadingProduct) || (!walletLoaded && ready)) {
    return (
      <main className="main-container">
        <div
          style={{
            background: '#f4f4f2',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 40,
          }}
        >
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: muted,
                fontSize: 13,
              }}
            >
              <Loader2 size={16} className="animate-spin" />
              {isEditMode ? 'Loading product…' : 'Loading wallet connection...'}
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="main-container">
      <div
        style={{
          background: '#f4f4f2',
          minHeight: '100vh',
          padding: '28px 24px',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <ScreenShell
            onBack={() => router.push('/products')}
            title={isEditMode ? 'Edit Item' : 'Create Item'}
            eyebrow="Products"
            kicker={
              isEditMode
                ? 'Update the details for this marketplace item and save your changes'
                : "Item details · please select the type of item you're creating for the Swop marketplace"
            }
            action={
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => router.push('/products')}>
                  Cancel
                </Button>
                {!isEditMode && (
                  <Button variant="ghost" disabled>
                    Save draft
                  </Button>
                )}
                <Button
                  variant="primary"
                  disabled={
                    isSubmitting ||
                    imageUploading ||
                    digitalUploading ||
                    (!isEditMode && (!solanaAddress || !agree))
                  }
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      {isEditMode ? 'Saving…' : 'Creating…'}
                    </>
                  ) : isEditMode ? (
                    'Save changes'
                  ) : (
                    'Create Item'
                  )}
                </Button>
              </div>
            }
          >
            {!isEditMode && ready && authenticated && !solanaAddress && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(217,119,6,0.08)',
                  border: '1px solid rgba(217,119,6,0.18)',
                  color: '#b45309',
                  fontSize: 12.5,
                }}
              >
                <strong style={{ fontWeight: 600 }}>
                  No Solana wallet detected.
                </strong>{' '}
                Connect your wallet to publish this item.
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
                gap: 14,
              }}
            >
              {/* LEFT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Identity */}
                <Card pad={20}>
                  <FormSection
                    title="Identity"
                    subtitle="Public details shown on the product page"
                  />
                  <Field label="Item Name" required error={formErrors.name}>
                    <TextInput
                      placeholder="All-Access pass"
                      value={name}
                      invalid={!!formErrors.name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Description"
                    required
                    error={formErrors.description}
                  >
                    <TextArea
                      rows={4}
                      placeholder="Write description"
                      value={description}
                      invalid={!!formErrors.description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </Field>
                </Card>

                {/* Media */}
                <Card pad={20}>
                  <FormSection
                    title="Media"
                    subtitle="Up to 4 images · JPG, JPEG, PNG"
                  />

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: ink,
                      fontWeight: 600,
                      marginBottom: 8,
                    }}
                  >
                    Main Image <span style={{ color: '#dc2626' }}>*</span>
                  </div>

                  <label
                    htmlFor="main-image"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleMainImageDrop}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      textAlign: 'center',
                      border: `1.5px dashed ${
                        formErrors.image ? '#dc2626' : hair
                      }`,
                      background: '#fafafa',
                      borderRadius: 14,
                      padding: '36px 20px',
                      cursor: 'pointer',
                    }}
                  >
                    {image ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Image
                          src={image}
                          width={120}
                          height={120}
                          alt="Main"
                          style={{
                            width: 120,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 12,
                          }}
                        />
                        <div style={{ fontSize: 12.5, color: muted }}>
                          {selectedImageName || 'Main image uploaded'}
                        </div>
                        <span style={{ ...primaryBtn, padding: '8px 28px' }}>
                          Replace
                        </span>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 12,
                            background: '#eee',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ImagePlus size={28} color="#888" strokeWidth={1.5} />
                        </div>
                        <div style={{ fontSize: 13, color: muted }}>
                          Browse or drag and drop an image here.
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: muted2,
                            fontFamily: mono,
                          }}
                        >
                          JPEG, JPG, PNG · max 8MB
                        </div>
                        <span style={{ ...primaryBtn, padding: '8px 28px' }}>
                          Browse
                        </span>
                      </>
                    )}
                    <input
                      id="main-image"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleMainImagePick}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {imageUploading && (
                    <p
                      style={{
                        fontSize: 11.5,
                        color: muted,
                        marginTop: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Loader2 size={12} className="animate-spin" />
                      Uploading…
                    </p>
                  )}
                  {imageError && (
                    <p style={{ fontSize: 11.5, color: '#dc2626', marginTop: 8 }}>
                      {imageError}
                    </p>
                  )}

                  {/* Additional images strip */}
                  <div
                    style={{
                      marginTop: 14,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 10,
                    }}
                  >
                    {extraImages.map((url, i) => (
                      <label
                        key={i}
                        htmlFor={`extra-image-${i}`}
                        style={{
                          aspectRatio: '1 / 1',
                          borderRadius: 10,
                          background: '#f0f0ee',
                          border: `1px dashed ${hair}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        {url ? (
                          <Image
                            src={url}
                            alt={`Extra ${i + 1}`}
                            width={120}
                            height={120}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <ImagePlus size={22} color="#aaa" strokeWidth={1.5} />
                        )}
                        <input
                          id={`extra-image-${i}`}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={handleExtraImagePick(i)}
                          style={{ display: 'none' }}
                        />
                      </label>
                    ))}
                  </div>
                </Card>

                {/* Variants */}
                <Card pad={20}>
                  <FormSection
                    title="Variants"
                    subtitle="Add options and set a quantity per option. Total available updates automatically once you enter option quantities."
                  />
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      marginTop: 8,
                    }}
                  >
                    {variants.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'minmax(0, 0.82fr) minmax(0, 1.18fr)',
                          gap: 14,
                          alignItems: 'start',
                        }}
                      >
                        <div>
                          {i === 0 && (
                            <div style={{ ...fieldLabel, marginBottom: 6 }}>
                              Product Category
                            </div>
                          )}
                          <TextInput
                            placeholder="e.g. Color"
                            value={c.name}
                            onChange={(e) => updateVariantName(i, e.target.value)}
                          />
                        </div>
                        <div>
                          {i === 0 && (
                            <div style={{ ...fieldLabel, marginBottom: 6 }}>
                              Options & inventory
                            </div>
                          )}
                          <div
                            style={{
                              border: `1px solid ${hair}`,
                              borderRadius: 9,
                              background: '#fff',
                              padding: 10,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                            }}
                          >
                            {c.options.map((opt, oi) => (
                              <div
                                key={`${opt.name}-${oi}`}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns:
                                    'minmax(0, 1fr) 84px 26px',
                                  gap: 8,
                                  alignItems: 'center',
                                }}
                              >
                                <div
                                  style={{
                                    minHeight: 34,
                                    borderRadius: 8,
                                    background: '#f0f0ee',
                                    padding: '8px 10px',
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    color: ink,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {opt.name}
                                </div>
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="Qty"
                                  value={opt.quantity}
                                  onChange={(e) =>
                                    updateVariantOptionQuantity(
                                      i,
                                      oi,
                                      e.target.value
                                    )
                                  }
                                  style={{
                                    ...inputStyle,
                                    height: 34,
                                    padding: '7px 9px',
                                    fontSize: 12,
                                    fontFamily: mono,
                                  }}
                                  aria-label={`${opt.name} quantity`}
                                />
                                <button
                                  type="button"
                                  aria-label={`Remove ${opt.name}`}
                                  onClick={() => removeVariantOption(i, oi)}
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 7,
                                    border: 0,
                                    background: 'transparent',
                                    color: muted2,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                            {c.options.length > 0 && (
                              <div
                                style={{
                                  height: 1,
                                  background: hair,
                                  margin: '2px 0',
                                }}
                              />
                            )}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(0, 1fr) auto',
                                gap: 8,
                                alignItems: 'center',
                              }}
                            >
                              <input
                                placeholder="add option..."
                                value={variantDraft[i] ?? ''}
                                onChange={(e) =>
                                  setVariantDraft((prev) => {
                                    const next = [...prev];
                                    next[i] = e.target.value;
                                    return next;
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addVariantOption(i, variantDraft[i] ?? '');
                                  }
                                }}
                                style={{
                                  ...inputStyle,
                                  height: 34,
                                  padding: '7px 10px',
                                  fontSize: 12.5,
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  addVariantOption(i, variantDraft[i] ?? '')
                                }
                                style={{
                                  ...ghostBtn,
                                  height: 34,
                                  borderRadius: 8,
                                  padding: '0 12px',
                                }}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(0, 0.82fr) minmax(0, 1.18fr)',
                        gap: 14,
                      }}
                    >
                      <button
                        type="button"
                        onClick={addVariantCategory}
                        style={{
                          ...ghostBtn,
                          width: '100%',
                          justifyContent: 'center',
                          borderStyle: 'dashed',
                        }}
                      >
                        + Add Category
                      </button>
                      <div
                        style={{
                          border: `1px solid ${hair}`,
                          borderRadius: 9,
                          background: '#fafafa',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <span style={{ fontSize: 12, color: muted }}>
                          Variant inventory total
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: mono,
                            color: ink,
                          }}
                        >
                          {variantInventoryTotal}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* RIGHT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Product type + sub-category */}
                <Card pad={20}>
                  <FormSection
                    title="Product Type"
                    subtitle="Pick Physical for shipped items or Digital for on-chain access, content, and vouchers."
                  />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    {(['Physical', 'Digital'] as const).map((t) => {
                      const active = type === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            border: `1.5px solid ${active ? ink : hair}`,
                            background: active ? ink : '#fff',
                            color: active ? '#fff' : ink,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          }}
                        >
                          {t === 'Physical' ? (
                            <Box size={14} />
                          ) : (
                            <FileText size={14} />
                          )}
                          {t} Item
                        </button>
                      );
                    })}
                  </div>

                </Card>

                {type === 'Digital' && (
                  <Card pad={20}>
                    <FormSection
                      title="Digital Delivery"
                      subtitle="Upload the file buyers unlock from their order options after the receipt NFT is minted."
                    />

                    <Field
                      label="Download file"
                      required
                      error={formErrors.digitalAsset}
                      help="PDF, ZIP, audio, image, or document files up to 100MB."
                    >
                      <label
                        htmlFor="digital-asset"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 14,
                          borderRadius: 12,
                          border: `1px dashed ${
                            formErrors.digitalAsset ? '#dc2626' : hair
                          }`,
                          background: '#fafafa',
                          cursor: digitalUploading ? 'wait' : 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: '#fff',
                            border: `1px solid ${hair}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: ink,
                          }}
                        >
                          {digitalUploading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <UploadCloud size={18} />
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: ink,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {digitalAsset?.fileName ||
                              digitalAsset?.originalName ||
                              'Choose a file to upload'}
                          </div>
                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 11.5,
                              color: muted,
                              fontFamily: mono,
                            }}
                          >
                            {digitalAsset?.enabled
                              ? `${formatFileSize(digitalAsset.size)} · locked by receipt NFT`
                              : 'Only buyers with the minted order receipt can download'}
                          </div>
                        </div>
                        {digitalAsset?.enabled ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              setDigitalAsset(null);
                            }}
                            aria-label="Remove digital file"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 7,
                              border: `1px solid ${hair}`,
                              background: '#fff',
                              color: muted,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={14} />
                          </button>
                        ) : null}
                        <input
                          id="digital-asset"
                          type="file"
                          onChange={handleDigitalAssetPick}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {digitalUploadError ? (
                        <p
                          style={{
                            fontSize: 11.5,
                            color: '#dc2626',
                            marginTop: 8,
                          }}
                        >
                          {digitalUploadError}
                        </p>
                      ) : null}
                    </Field>

                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        padding: '12px 14px',
                        border: `1px solid ${hair}`,
                        borderRadius: 12,
                        background: '#fff',
                        marginBottom: 14,
                      }}
                    >
                      <Lock size={16} style={{ marginTop: 2, color: ink }} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                          Receipt-gated download
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: muted,
                            lineHeight: 1.5,
                            marginTop: 3,
                          }}
                        >
                          After payment, Swop mints the buyer an order receipt
                          NFT. The order options download checks that receipt
                          before streaming this file.
                        </div>
                      </div>
                    </div>

                    <Field label="Delivery note">
                      <TextArea
                        rows={3}
                        placeholder="Add install steps, license notes, or a thank-you message"
                        value={digitalDeliveryNote}
                        onChange={(e) => setDigitalDeliveryNote(e.target.value)}
                      />
                    </Field>
                  </Card>
                )}

                {/* Inventory */}
                <Card pad={20}>
                  <FormSection title="Inventory" />
                  <Field
                    label="Total Available"
                    required
                    error={formErrors.quantity}
                    help={
                      hasVariantInventory
                        ? 'Calculated from variant option quantities.'
                        : 'Used when this product has no variant inventory.'
                    }
                  >
                    <TextInput
                      type="number"
                      min={1}
                      placeholder="Quantity for sale"
                      value={
                        hasVariantInventory
                          ? String(variantInventoryTotal)
                          : quantity
                      }
                      invalid={!!formErrors.quantity}
                      disabled={hasVariantInventory}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={{
                        fontFamily: mono,
                        background: hasVariantInventory ? '#f5f5f3' : '#fff',
                      }}
                    />
                  </Field>
                </Card>

                {/* Pricing */}
                <Card pad={20}>
                  <FormSection
                    title="Pricing"
                    subtitle="Your product price"
                  />
                  <Field
                    label="Price"
                    required
                    error={formErrors.price}
                    help="Priced in US dollars. Buyers can pay with any currency."
                  >
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: 14,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 13,
                          color: muted,
                          fontFamily: mono,
                        }}
                      >
                        $
                      </span>
                      <TextInput
                        placeholder="0"
                        value={price}
                        invalid={!!formErrors.price}
                        onChange={(e) => setPrice(e.target.value)}
                        style={{
                          paddingLeft: 26,
                          fontFamily: mono,
                        }}
                      />
                    </div>
                  </Field>

                  <Field
                    label="Payout token"
                    help="The token you receive when this item sells. The buyer is charged in US dollars and can pay with any currency."
                  >
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '0 12px',
                        height: 42,
                        border: `1px solid ${hair}`,
                        borderRadius: 9,
                        background: '#fff',
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          minWidth: 20,
                          borderRadius: 10,
                          background: activePayoutToken.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {activePayoutToken.badge}
                      </span>
                      <select
                        value={payoutToken}
                        onChange={(e) => setPayoutToken(e.target.value)}
                        aria-label="Payout token"
                        style={
                          {
                            flex: 1,
                            minWidth: 0,
                            appearance: 'none',
                            border: 0,
                            background: 'transparent',
                            fontSize: 13,
                            fontWeight: 600,
                            color: ink,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            paddingRight: 16,
                            outline: 'none',
                          } as CSSProperties
                        }
                      >
                        {PAYOUT_TOKEN_OPTIONS.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <span
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: muted,
                          fontSize: 10,
                        }}
                      >
                        ▾
                      </span>
                    </div>
                  </Field>

                  {type === 'Physical' && (
                    <Field label="Shipping?">
                      <div>
                        <div style={{ position: 'relative' }}>
                          <select
                            value={shipping}
                            onChange={(e) =>
                              setShipping(e.target.value as 'Yes' | 'No')
                            }
                            style={
                              {
                                ...inputStyle,
                                appearance: 'none',
                                cursor: 'pointer',
                              } as CSSProperties
                            }
                          >
                            <option>Yes</option>
                            <option>No</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>
                        Shipped physical items use escrow until the buyer confirms the order was received.
                      </div>
                    </Field>
                  )}

                  {type === 'Physical' && shipping === 'Yes' && (
                    <Field
                      label="Shipping cost"
                      required
                      error={formErrors.shippingCost}
                      help="Charged to the buyer at checkout on top of the price. Enter 0 for free shipping."
                    >
                      <div style={{ position: 'relative' }}>
                        <span
                          style={{
                            position: 'absolute',
                            left: 14,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: 13,
                            color: muted,
                            fontFamily: mono,
                          }}
                        >
                          $
                        </span>
                        <TextInput
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0"
                          value={shippingCost}
                          invalid={!!formErrors.shippingCost}
                          onChange={(e) => setShippingCost(e.target.value)}
                          style={{ paddingLeft: 26, fontFamily: mono }}
                        />
                      </div>
                    </Field>
                  )}
                </Card>

                {/* Agreement */}
                {!isEditMode && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '14px 16px',
                    background: '#fafafa',
                    borderRadius: 12,
                    border: `1px solid ${hair}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setAgree(!agree)}
                    aria-pressed={agree}
                    style={{
                      width: 18,
                      height: 18,
                      minWidth: 18,
                      marginTop: 1,
                      borderRadius: 5,
                      border: `1.5px solid ${agree ? ink : muted2}`,
                      background: agree ? ink : '#fff',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {agree && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    I agree with Swop&apos;s{' '}
                    <a
                      href="https://www.swopme.co/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: ink, textDecoration: 'underline' }}
                    >
                      Minting Privacy &amp; Policy
                    </a>
                    .
                  </div>
                </div>
                )}
              </div>
            </div>
          </ScreenShell>
        </div>
      </div>

      <MintAlertModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        modelInfo={modelInfo}
      />
    </main>
  );
};

export default CreateProduct;
