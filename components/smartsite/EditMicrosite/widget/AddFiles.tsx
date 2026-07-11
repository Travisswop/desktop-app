"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { FileText, Loader, Lock, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { handleCreateWidget } from "@/actions/widget";
import FilesCard from "@/components/publicProfile/widgets/FilesCard";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { sendCloudinaryFile } from "@/lib/SendCloudinaryAnyFile";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";

type StoredFile = { id: string; name: string; url: string; mimeType?: string; size?: number; gated?: boolean };

export default function AddFiles({ onCloseModal }: { onCloseModal: () => void }) {
  const site: any = useSmartSiteApiDataStore((state) => state);
  const [token, setToken] = useState("");
  const [title, setTitle] = useState("Downloads");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => setToken(Cookies.get("access-token") || ""), []);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    setUploading(true);
    try {
      const added = await Promise.all(selected.map(async (file, index) => ({
        id: `file-${Date.now()}-${index}`,
        name: file.name,
        url: await sendCloudinaryFile(await readDataUrl(file), file.type || "application/octet-stream", file.name),
        mimeType: file.type || undefined,
        size: file.size,
        gated: false,
      })));
      setFiles((current) => [...current, ...added]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const save = async () => {
    if (!title.trim() || !files.length) return toast.error("Enter a title and upload at least one file");
    setSaving(true);
    try {
      const result = await handleCreateWidget({ micrositeId: site._id, widgetType: "files", config: { title: title.trim(), files } }, token);
      if (result?.state !== "success") throw new Error(result?.message || "Could not save Files");
      toast.success("Files added");
      onCloseModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save Files");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none";
  return <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2"><div className="flex flex-col gap-4"><h2 className="text-xl font-bold">Files</h2><label className="text-xs font-bold text-gray-500">Section title<input className={`${input} mt-1`} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white">{uploading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Upload any file<input type="file" multiple className="hidden" onChange={(event) => void upload(event)} /></label><a href={`/smartsite/token-gated/${site._id}`} className="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-bold"><Lock size={15} />Manage token gate</a>{files.map((file) => <div key={file.id} className="flex items-center gap-2 rounded-xl bg-gray-100 p-3"><FileText size={17} /><span className="min-w-0 flex-1 truncate text-sm font-bold">{file.name}</span><label className="flex items-center gap-1 text-[11px] font-bold text-gray-500"><Lock size={13} />Gated<input type="checkbox" checked={Boolean(file.gated)} onChange={() => setFiles((current) => current.map((item) => item.id === file.id ? { ...item, gated: !item.gated } : item))} /></label><button type="button" onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))}><Trash2 size={16} className="text-red-500" /></button></div>)}<PrimaryButton onClick={() => void save()} disabled={saving || uploading}>{saving ? <Loader className="mx-auto h-5 w-5 animate-spin" /> : "Save Files"}</PrimaryButton></div><FilesCard config={{ title, files }} mode="builder" /></div>;
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}
