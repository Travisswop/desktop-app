'use client';

import { sendCloudinaryImage } from '@/lib/SendCloudinaryImage';
import { useUser } from '@/lib/UserContext';
import { useDisclosure } from '@nextui-org/react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { DragEvent, useEffect, useState, type CSSProperties } from 'react';
import { Box, FileText, ImagePlus, Loader2 } from 'lucide-react';
import MintAlertModal from './MintAlertModal';
import {
  DIGITAL_COLLECTIONS,
  PHYSICAL_COLLECTIONS,
} from '@/constants/mintCollections';
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

interface ModelInfo {
  success: boolean;
  nftType: string;
  details?: string;
  title?: string;
}

interface Variant {
  name: string;
  options: string[];
}

const blankExtraImages = (): (string | null)[] => [null, null, null, null];

const padExtraImages = (images: string[] = []) => {
  const next = blankExtraImages();
  images.slice(0, next.length).forEach((url, index) => {
    next[index] = url;
  });
  return next;
};

const variantsFromBenefits = (benefits: string[] = []): Variant[] => {
  const grouped = benefits.reduce<Record<string, string[]>>((acc, benefit) => {
    const [rawName, ...rest] = benefit.split(':');
    if (!rest.length) {
      acc.Benefits = [...(acc.Benefits || []), benefit];
      return acc;
    }
    const name = rawName.trim() || 'Options';
    const option = rest.join(':').trim();
    acc[name] = [...(acc[name] || []), option];
    return acc;
  }, {});

  const variants = Object.entries(grouped).map(([name, options]) => ({
    name,
    options,
  }));

  return variants.length ? variants : [{ name: '', options: [] }];
};

const mergeVariantDrafts = (
  variants: Variant[],
  drafts: string[]
): Variant[] =>
  variants
    .map((variant, index) => {
      const draft = drafts[index]?.trim();
      const options =
        draft && !variant.options.includes(draft)
          ? [...variant.options, draft]
          : variant.options;
      return {
        name: variant.name.trim(),
        options: options.map((option) => option.trim()).filter(Boolean),
      };
    })
    .filter((variant) => variant.name || variant.options.length);

const CreateProduct = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');
  const isEditMode = Boolean(templateId);
  const { isOpen, onOpenChange } = useDisclosure();
  const { user, accessToken } = useUser();
  const { ready, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();

  const [type, setType] = useState<'Physical' | 'Digital'>('Physical');
  const [selectedCollectionName, setSelectedCollectionName] = useState('');
  const availableCollections =
    type === 'Physical' ? PHYSICAL_COLLECTIONS : DIGITAL_COLLECTIONS;
  const selectedCollection =
    availableCollections.find((c) => c.name === selectedCollectionName) ?? null;

  const [shipping, setShipping] = useState<'Yes' | 'No'>('Yes');
  const [agree, setAgree] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [extraImages, setExtraImages] = useState<(string | null)[]>(
    blankExtraImages
  );
  const [price, setPrice] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [royaltyAddress, setRoyaltyAddress] = useState('');
  const [royaltyPercent, setRoyaltyPercent] = useState('0');
  const [variants, setVariants] = useState<Variant[]>([
    { name: '', options: [] },
  ]);
  const [variantDraft, setVariantDraft] = useState<string[]>([]);

  const [selectedImageName, setSelectedImageName] = useState<string | null>(
    null
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [walletLoaded, setWalletLoaded] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modelInfo, setModelInfo] = useState<ModelInfo>({
    success: false,
    nftType: '',
    details: '',
  });

  useEffect(() => {
    if (ready && authenticated) {
      if (wallets && wallets.length > 0) {
        setSolanaAddress(wallets[0]?.address || null);
      }
      setWalletLoaded(true);
    }
  }, [ready, authenticated, wallets]);

  useEffect(() => {
    if (!templateId || !accessToken) return;

    let cancelled = false;
    const loadTemplate = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/nft/template/${templateId}`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const data = await response.json().catch(() => null);
        if (!response.ok || data?.state !== 'success' || !data?.data) {
          throw new Error(data?.message || `template ${response.status}`);
        }
        if (cancelled) return;

        const template = data.data;
        const collection =
          [...PHYSICAL_COLLECTIONS, ...DIGITAL_COLLECTIONS].find(
            (c) => c.name === template.nftType
          ) ?? null;
        if (collection) {
          setType(collection.category === 'physical' ? 'Physical' : 'Digital');
          setSelectedCollectionName(collection.name);
        }
        setName(template.name || '');
        setDescription(template.description || '');
        setImage(template.image || '');
        setExtraImages(padExtraImages(template.extraImages));
        setSelectedImageName(template.image ? 'Current image' : null);
        setPrice(String(template.price ?? ''));
        setQuantity(String(template.mintLimit ?? ''));
        setRoyaltyPercent(String(template.royaltyPercentage ?? 0));
        setShipping(template.shippingRequired ? 'Yes' : 'No');
        setShippingCost(String(template.shippingCost ?? ''));
        setVariants(
          Array.isArray(template.variants) && template.variants.length
            ? template.variants
            : variantsFromBenefits(template.benefits)
        );
        setVariantDraft([]);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setModelInfo({
            success: false,
            nftType: 'Product',
            details:
              err instanceof Error
                ? err.message
                : 'Failed to load product.',
          });
          onOpenChange();
        }
      }
    };

    loadTemplate();
    return () => {
      cancelled = true;
    };
  }, [accessToken, onOpenChange, templateId]);

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
      next[i] = { ...next[i], options: [...next[i].options, v] };
      return next;
    });
    setVariantDraft((prev) => {
      const next = [...prev];
      next[i] = '';
      return next;
    });
  };

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

  const handleTypeSelect = (nextType: 'Physical' | 'Digital') => {
    setType(nextType);
    setSelectedCollectionName('');
    setFormErrors((prev) => ({ ...prev, collection: '' }));
  };

  const handleCollectionSelect = (collectionName: string) => {
    setSelectedCollectionName(collectionName);
    setFormErrors((prev) => ({ ...prev, collection: '' }));
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!selectedCollection) errors.collection = 'Category is required';
    if (!name.trim()) errors.name = 'Name is required';
    if (!description.trim()) errors.description = 'Description is required';
    if (!image) errors.image = 'Main image is required';
    if (!price.trim()) errors.price = 'Price is required';
    if (price && isNaN(Number(price))) errors.price = 'Price must be a number';
    if (!quantity.trim()) {
      errors.quantity = 'Total available is required';
    } else if (Number(quantity) <= 0) {
      errors.quantity = 'Must be greater than 0';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const readResponseBody = async (response: Response) => {
    try {
      return await response.json();
    } catch {
      return null;
    }
  };

  const getFailureMessage = (
    data: { message?: string; error?: unknown } | null,
    response?: Response
  ) => {
    if (data?.message) return data.message;
    if (typeof data?.error === 'string') return data.error;
    if (data?.error && typeof data.error === 'object') {
      return JSON.stringify(data.error);
    }
    return response
      ? `Server returned ${response.status}. Please try again later.`
      : 'An unexpected error occurred. Please try again.';
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!selectedCollection) return;

    if (!solanaAddress) {
      setModelInfo({
        success: false,
        nftType: selectedCollection.displayName,
        details:
          'Solana wallet address not available. Please make sure your wallet is connected.',
      });
      onOpenChange();
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedVariants = mergeVariantDrafts(variants, variantDraft);
      const payload = {
        userId: user._id,
        nftType: selectedCollection.name,
        collectionId: selectedCollection._id,
        collectionMintAddress: selectedCollection.address,
        name,
        description,
        image,
        extraImages: extraImages.filter(Boolean),
        price: Number(price),
        currency: 'usdc',
        mintLimit: Number(quantity),
        variants: normalizedVariants,
        benefits: normalizedVariants
          .flatMap((v) =>
            v.options.map((o) => (v.name ? `${v.name}: ${o}` : o))
          )
          .filter(Boolean),
        royaltyPercentage: Number(royaltyPercent) || 0,
        shippingRequired: type === 'Physical' && shipping === 'Yes',
        shippingCost:
          type === 'Physical' && shipping === 'Yes'
            ? Number(shippingCost) || 0
            : 0,
        ownerAddress: solanaAddress,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/nft/template${
          templateId ? `/${templateId}` : ''
        }`,
        {
          method: templateId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await readResponseBody(response);
      if (response.ok && data?.state === 'success') {
        setModelInfo({
          success: true,
          nftType: selectedCollection.displayName,
          title: `${selectedCollection.displayName} ${
            templateId ? 'Updated' : 'Created'
          }`,
          details: data.message,
        });
        onOpenChange();
        setTimeout(() => router.push('/products'), 2000);
      } else {
        setModelInfo({
          success: false,
          nftType: selectedCollection.displayName,
          details: getFailureMessage(data, response),
        });
        onOpenChange();
      }
    } catch (err) {
      console.error(err);
      setModelInfo({
        success: false,
        nftType: selectedCollection.displayName,
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

  if (!walletLoaded && ready) {
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
              Loading wallet connection...
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
          padding: '28px 24px 120px',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <ScreenShell
            onBack={() => router.push('/products')}
            title={isEditMode ? 'Edit Item' : 'Create Item'}
            eyebrow="Products"
            kicker={
              isEditMode
                ? "Update this item's marketplace details"
                : "Item details · please select the type of item you're creating for the Swop marketplace"
            }
            action={
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => router.push('/products')}>
                  Cancel
                </Button>
                <Button variant="ghost" disabled>
                  Save draft
                </Button>
                <Button
                  variant="primary"
                  disabled={
                    isSubmitting || !solanaAddress || (!isEditMode && !agree)
                  }
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      {isEditMode ? 'Updating…' : 'Creating…'}
                    </>
                  ) : (
                    isEditMode ? 'Update Item' : 'Create Item'
                  )}
                </Button>
              </div>
            }
          >
            {ready && authenticated && !solanaAddress && (
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
                  <Field
                    label="Item Name"
                    required
                    error={formErrors.name}
                    help="Note: Your item name can't be changed after creation."
                  >
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
                  {formErrors.image && !imageError && (
                    <p style={{ fontSize: 11.5, color: '#dc2626', marginTop: 8 }}>
                      {formErrors.image}
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
                    subtitle="Add categories like Color or Size, then list options"
                  />
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      marginTop: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                      }}
                    >
                      <div style={fieldLabel}>Product Category</div>
                      <div style={fieldLabel}>Options</div>
                    </div>
                    {variants.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 12,
                          alignItems: 'start',
                        }}
                      >
                        <div>
                          <TextInput
                            placeholder="e.g. Color"
                            value={c.name}
                            onChange={(e) => updateVariantName(i, e.target.value)}
                          />
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                            gap: 8,
                            alignItems: 'stretch',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 6,
                              padding: '8px 10px',
                              border: `1px solid ${hair}`,
                              borderRadius: 9,
                              minHeight: 38,
                              alignItems: 'center',
                            }}
                          >
                            {c.options.map((opt, oi) => (
                              <span
                                key={`${opt}-${oi}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  background: '#f0f0ee',
                                  fontSize: 12,
                                  fontWeight: 500,
                                }}
                              >
                                {opt}
                                <span
                                  style={{
                                    color: muted2,
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    lineHeight: 1,
                                  }}
                                  onClick={() => removeVariantOption(i, oi)}
                                >
                                  ×
                                </span>
                              </span>
                            ))}
                            <input
                              placeholder="add…"
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
                                flex: 1,
                                minWidth: 60,
                                padding: '4px 6px',
                                border: 0,
                                outline: 'none',
                                fontSize: 12,
                                fontFamily: 'inherit',
                                background: 'transparent',
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              addVariantOption(i, variantDraft[i] ?? '')
                            }
                            style={{
                              ...ghostBtn,
                              minWidth: 64,
                              height: '100%',
                              padding: '0 10px',
                              justifyContent: 'center',
                            }}
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    ))}
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
                          onClick={() => handleTypeSelect(t)}
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

                  <div style={{ marginTop: 14 }}>
                    <Field
                      label={`${type} Category`}
                      required
                      error={formErrors.collection}
                      help="This determines the collection used to create the item."
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr',
                          gap: 8,
                        }}
                      >
                        {availableCollections.map((collection) => {
                          const active =
                            selectedCollectionName === collection.name;
                          return (
                            <button
                              key={collection._id}
                              type="button"
                              onClick={() =>
                                handleCollectionSelect(collection.name)
                              }
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: `1.5px solid ${
                                  active
                                    ? ink
                                    : formErrors.collection
                                      ? '#dc2626'
                                      : hair
                                }`,
                                background: active ? '#f7f7f5' : '#fff',
                                color: ink,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                              }}
                            >
                              <span
                                style={{
                                  width: 18,
                                  height: 18,
                                  minWidth: 18,
                                  marginTop: 1,
                                  borderRadius: 9,
                                  border: `1.5px solid ${
                                    active ? ink : muted2
                                  }`,
                                  background: active ? ink : '#fff',
                                  boxShadow: active
                                    ? 'inset 0 0 0 4px #fff'
                                    : 'none',
                                }}
                              />
                              <span style={{ minWidth: 0 }}>
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: 13,
                                    fontWeight: 650,
                                    lineHeight: 1.25,
                                  }}
                                >
                                  {collection.displayName}
                                </span>
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: 11.5,
                                    color: muted,
                                    lineHeight: 1.35,
                                    marginTop: 3,
                                  }}
                                >
                                  {collection.description}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  </div>
                </Card>

                {/* Inventory & royalty */}
                <Card pad={20}>
                  <FormSection title="Inventory & royalty" />
                  <Field
                    label="Total Available"
                    required
                    error={formErrors.quantity}
                  >
                    <TextInput
                      type="number"
                      min={1}
                      placeholder="Quantity for sale"
                      value={quantity}
                      invalid={!!formErrors.quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Royalty Recipient"
                    help="Royalties paid to a wallet on every secondary sale."
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px',
                        gap: 8,
                      }}
                    >
                      <TextInput
                        placeholder="Search or paste address"
                        value={royaltyAddress}
                        onChange={(e) => setRoyaltyAddress(e.target.value)}
                      />
                      <div style={{ position: 'relative' }}>
                        <TextInput
                          placeholder="0"
                          value={royaltyPercent}
                          onChange={(e) => setRoyaltyPercent(e.target.value)}
                          style={{ paddingRight: 22 }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: 12,
                            color: muted,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        ...ghostBtn,
                        marginTop: 10,
                        width: '100%',
                        justifyContent: 'center',
                        borderStyle: 'dashed',
                      }}
                    >
                      + Add Person
                    </button>
                  </Field>
                </Card>

                {/* Pricing */}
                <Card pad={20}>
                  <FormSection
                    title="Pricing"
                    subtitle="Your product price and shipping cost"
                  />
                  <Field
                    label="Price"
                    required
                    error={formErrors.price}
                    help="Currency can't be changed after creation."
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 130px',
                        gap: 8,
                      }}
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
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '0 14px',
                          border: `1px solid ${hair}`,
                          borderRadius: 9,
                          background: '#fafafa',
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            background: '#2775CA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          $
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>USDC</span>
                      </div>
                    </div>
                  </Field>

                  {type === 'Physical' && (
                    <Field label="Shipping?">
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 8,
                        }}
                      >
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
                            value={shippingCost}
                            disabled={shipping === 'No'}
                            onChange={(e) => setShippingCost(e.target.value)}
                            style={{
                              paddingLeft: 26,
                              fontFamily: mono,
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>
                        Cost charged in addition to the item price.
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
