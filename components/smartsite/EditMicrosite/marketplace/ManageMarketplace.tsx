"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Loader, Plus, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import {
  createMarketplaceProduct,
  listMarketplaceProducts,
  updateMarketplaceProduct,
  type MarketplaceProduct,
} from "@/lib/marketplace-api";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import {
  createMarketPlace,
  deleteMarketplaceCategory,
  handleDeleteMarketPlace,
  renameMarketplaceCategory,
} from "@/actions/handleMarketPlace";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";

type MarketplaceEntry = {
  _id: string;
  micrositeId: string;
  carouselTitle?: string;
  marketplaceProductId?: string | MarketplaceProduct;
  itemName?: string;
  itemImageUrl?: string;
  itemPrice?: number;
};

const DEFAULT_ROW = "Featured products";
const productImage = (product: MarketplaceProduct) =>
  product.primaryImage || product.images?.[0]?.url || "";
const productAmount = (product: MarketplaceProduct) => Number(product.price?.amount || 0);
const entryProductId = (entry: MarketplaceEntry) => {
  const value = entry.marketplaceProductId;
  return typeof value === "string" ? value : value?._id || "";
};

export default function ManageMarketplace({ onCloseModal }: { onCloseModal: () => void }) {
  const { accessToken } = useUser();
  const params = useParams();
  const router = useRouter();
  const micrositeId = String(params?.editId || "");
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [entries, setEntries] = useState<MarketplaceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [rowName, setRowName] = useState(DEFAULT_ROW);
  const [editingCategory, setEditingCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken || !micrositeId) return;
    setLoading(true);
    try {
      const [productResponse, marketplaceResponse] = await Promise.all([
        listMarketplaceProducts(accessToken, { scope: "mine", limit: 200 }),
        fetch(
          (process.env.NEXT_PUBLIC_API_URL || "") + "/api/v5/microsite/marketplace/" + micrositeId,
          { headers: { authorization: "Bearer " + accessToken }, cache: "no-store" },
        ).then((response) => response.json()),
      ]);
      setProducts(productResponse.items || []);
      setEntries(marketplaceResponse.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load marketplace");
    } finally {
      setLoading(false);
    }
  }, [accessToken, micrositeId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const categories = useMemo(() => {
    const grouped = new Map<string, MarketplaceEntry[]>();
    entries.forEach((entry) => {
      const title = entry.carouselTitle?.trim() || DEFAULT_ROW;
      grouped.set(title, [...(grouped.get(title) || []), entry]);
    });
    return [...grouped.entries()].map(([title, items]) => ({ title, items }));
  }, [entries]);

  const startNewCategory = () => {
    setEditingCategory("");
    setRowName("Category " + (categories.length + 1));
    setSelectedIds(new Set());
  };
  const startEditCategory = (title: string) => {
    setEditingCategory(title);
    setRowName(title);
    setSelectedIds(new Set());
  };

  const saveCategory = async () => {
    const title = rowName.trim();
    if (!title) return toast.error("Enter a category name");
    if (!editingCategory && selectedIds.size === 0) return toast.error("Select at least one product");
    setSavingCategory(true);
    try {
      if (editingCategory && editingCategory !== title) {
        const renamed = await renameMarketplaceCategory(
          { micrositeId, currentTitle: editingCategory, nextTitle: title },
          accessToken || "",
        );
        if (!renamed) throw new Error("Could not rename category");
      }
      const selected = products.filter((product) => selectedIds.has(product._id));
      if (selected.length) {
        const created = await createMarketPlace({
          micrositeId,
          template: {},
          multipleItems: selected.map((product) => ({
            source: "marketplaceProduct",
            marketplaceProductId: product._id,
            templateId: product._id,
            carouselTitle: title,
            itemName: product.title,
            itemImageUrl: productImage(product),
            itemDescription: product.description || "",
            itemPrice: productAmount(product),
            mintLimit: product.inventory?.available ?? undefined,
          })),
        }, accessToken || "");
        if (!created || created.state === "failed") throw new Error(created?.message || "Could not add products");
      }
      toast.success("Marketplace category saved");
      await refresh();
      router.refresh();
      onCloseModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Category save failed");
    } finally {
      setSavingCategory(false);
    }
  };

  const removeCategory = async (title: string) => {
    if (!window.confirm("Remove “" + title + "” from this SmartSite? Products remain in your dashboard.")) return;
    const result = await deleteMarketplaceCategory({ micrositeId, title }, accessToken || "");
    if (!result) return toast.error("Could not delete category");
    toast.success("Category deleted");
    await refresh();
    router.refresh();
  };

  const removeEntry = async (entry: MarketplaceEntry) => {
    const result = await handleDeleteMarketPlace(
      { _id: entry._id, micrositeId },
      accessToken || "",
    );
    if (!result) return toast.error("Could not remove product");
    await refresh();
    router.refresh();
  };

  const openProductEditor = (product?: MarketplaceProduct) => {
    setEditingProduct(product || null);
    setProductName(product?.title || "");
    setPrice(product ? String(productAmount(product)) : "");
    setImageUrl(product ? productImage(product) : "");
    setProductEditorOpen(true);
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      setImageUrl(await sendCloudinaryImage(await readDataUrl(file)));
    } catch {
      toast.error("Image upload failed");
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  };

  const saveProduct = async () => {
    const amount = Number(price);
    if (!productName.trim() || !imageUrl || !Number.isFinite(amount) || amount <= 0) {
      return toast.error("Add a product name, price, and image");
    }
    setSavingProduct(true);
    try {
      const payload = {
        productType: editingProduct?.productType || "physical",
        title: productName.trim(),
        description: editingProduct?.description || productName.trim() + " available on Swop",
        primaryImage: imageUrl,
        images: [{ url: imageUrl, alt: productName.trim() }],
        price: { amount, currency: "USDC" },
        payoutToken: "USDC",
        inventory: { track: true, available: editingProduct?.inventory?.available || 999 },
        fulfillment: {
          requiresShipping: editingProduct?.fulfillment?.requiresShipping || false,
          shippingCost: editingProduct?.fulfillment?.shippingCost || 0,
          trackingEnabled: editingProduct?.fulfillment?.trackingEnabled || false,
        },
      };
      if (editingProduct) await updateMarketplaceProduct(accessToken || "", editingProduct._id, payload);
      else await createMarketplaceProduct(accessToken || "", payload);
      toast.success(editingProduct ? "Product updated" : "Product created");
      setProductEditorOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Product save failed");
    } finally {
      setSavingProduct(false);
    }
  };

  const archiveProduct = async (product: MarketplaceProduct) => {
    if (!window.confirm("Archive “" + product.title + "” and remove it from this SmartSite?")) return;
    try {
      await updateMarketplaceProduct(accessToken || "", product._id, { status: "archived" });
      const linked = entries.filter((entry) => entryProductId(entry) === product._id);
      await Promise.all(linked.map((entry) => handleDeleteMarketPlace({ _id: entry._id, micrositeId }, accessToken || "")));
      toast.success("Product deleted");
      await refresh();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete product");
    }
  };

  if (loading) return <div className="grid min-h-72 place-items-center"><Loader className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1.25fr]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Marketplace Categories</h2>
          <button type="button" onClick={startNewCategory} className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-2 text-xs font-bold"><Plus size={14} />Add category</button>
        </div>
        {categories.map((category) => (
          <div key={category.title} className="rounded-2xl border border-black/10 p-3">
            <div className="flex items-center gap-2">
              <h3 className="min-w-0 flex-1 truncate font-bold">{category.title}</h3>
              <button type="button" onClick={() => startEditCategory(category.title)}><Edit3 size={16} /></button>
              <button type="button" onClick={() => void removeCategory(category.title)}><Trash2 size={16} className="text-red-500" /></button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {category.items.map((entry) => (
                <div key={entry._id} className="relative w-28 flex-none rounded-xl bg-gray-100 p-2">
                  {entry.itemImageUrl ? <div className="relative h-20 overflow-hidden rounded-lg"><Image src={entry.itemImageUrl} alt="" fill className="object-cover" /></div> : null}
                  <p className="mt-1 truncate text-xs font-bold">{entry.itemName || "Product"}</p>
                  <button type="button" onClick={() => void removeEntry(entry)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"><X size={11} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-black/10 p-4">
        <h3 className="font-bold">{editingCategory ? "Edit category" : "New category"}</h3>
        <input value={rowName} onChange={(event) => setRowName(event.target.value)} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none" placeholder="Category name" />
        <p className="text-xs text-gray-500">Select products to add to this row.</p>
        <div className="grid grid-cols-2 gap-3">
          {products.filter((product) => product.status === "live").map((product) => {
            const selected = selectedIds.has(product._id);
            return (
              <button type="button" key={product._id} onClick={() => setSelectedIds((current) => {
                const next = new Set(current);
                if (next.has(product._id)) next.delete(product._id); else next.add(product._id);
                return next;
              })} className={"relative rounded-xl border-2 p-2 text-left " + (selected ? "border-black" : "border-transparent bg-gray-100")}>
                {productImage(product) ? <div className="relative aspect-square overflow-hidden rounded-lg"><Image src={productImage(product)} alt="" fill className="object-cover" /></div> : null}
                <p className="mt-2 truncate text-sm font-bold">{product.title}</p>
                <p className="text-xs text-gray-500">{"$" + productAmount(product).toFixed(2)}</p>
                <span className="absolute bottom-2 right-2 flex gap-2">
                  <span onClick={(event) => { event.stopPropagation(); openProductEditor(product); }}><Edit3 size={14} /></span>
                  <span onClick={(event) => { event.stopPropagation(); void archiveProduct(product); }}><Trash2 size={14} className="text-red-500" /></span>
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => openProductEditor()} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 px-4 py-3 text-sm font-bold"><Plus size={16} />Add product</button>
        <PrimaryButton onClick={() => void saveCategory()} disabled={savingCategory}>{savingCategory ? <Loader className="mx-auto h-5 w-5 animate-spin" /> : "Save category"}</PrimaryButton>
        {productEditorOpen ? (
          <div className="mt-2 flex flex-col gap-3 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between"><h3 className="font-bold">{editingProduct ? "Edit product" : "New product"}</h3><button type="button" onClick={() => setProductEditorOpen(false)}><X size={17} /></button></div>
            {imageUrl ? <div className="relative aspect-video overflow-hidden rounded-xl"><Image src={imageUrl} alt="" fill className="object-cover" /></div> : null}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 px-4 py-3 text-sm font-bold">{imageUploading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload size={15} />}Upload image<input type="file" accept="image/*" className="hidden" onChange={(event) => void uploadImage(event)} /></label>
            <input value={productName} onChange={(event) => setProductName(event.target.value)} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none" placeholder="Product name" />
            <input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none" placeholder="Price in USDC" />
            <PrimaryButton onClick={() => void saveProduct()} disabled={savingProduct || imageUploading}>{savingProduct ? <Loader className="mx-auto h-5 w-5 animate-spin" /> : "Save product"}</PrimaryButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}
