"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { Edit3, Eye, Loader, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { deleteBlog, postBlog, updateBlog } from "@/actions/blog";
import CustomFileInput from "@/components/CustomFileInput";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";

type PostStatus = "published" | "draft" | "scheduled";
type BlogPost = {
  _id?: string;
  micrositeId?: string;
  title?: string;
  headline?: string;
  description?: string;
  image?: string;
  category?: string;
  status?: PostStatus;
  scheduledAt?: string | null;
  totalTap?: number;
};

const Editor = dynamic<any>(
  () => import("@tinymce/tinymce-react").then((mod) => mod.Editor as unknown as React.ComponentType<any>),
  { ssr: false },
);

const inputClass = "w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-black/30";

const AddBlog = ({ onCloseModal }: { onCloseModal: () => void }) => {
  const smartsite: any = useSmartSiteApiDataStore((state) => state);
  const [token, setToken] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [status, setStatus] = useState<PostStatus>("published");
  const [scheduledAt, setScheduledAt] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const posts = useMemo<BlogPost[]>(() => smartsite.info?.blog || [], [smartsite.info?.blog]);

  useEffect(() => setToken(Cookies.get("access-token") || ""), []);

  const resetComposer = () => {
    setEditingId(null);
    setTitle("");
    setHeadline("");
    setBody("");
    setCategory("General");
    setStatus("published");
    setScheduledAt("");
    setImage("");
    setImageFile(null);
  };

  const newPost = () => {
    resetComposer();
    setComposerOpen(true);
  };

  const editPost = (post: BlogPost) => {
    setEditingId(post._id || null);
    setTitle(post.title || "");
    setHeadline(post.headline || "");
    setBody(post.description || "");
    setCategory(post.category || "General");
    setStatus(post.status || "published");
    setScheduledAt(post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : "");
    setImage(post.image || "");
    setImageFile(null);
    setComposerOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Cover must be under 10 MB");
    const reader = new FileReader();
    reader.onloadend = () => setImageFile(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !headline.trim() || !body.trim()) return toast.error("Add a title, excerpt, and body");
    if (!image && !imageFile) return toast.error("Add a cover image");
    if (status === "scheduled" && !scheduledAt) return toast.error("Choose a publish date");
    setSaving(true);
    try {
      const imageUrl = imageFile ? await sendCloudinaryImage(imageFile) : image;
      const payload = {
        micrositeId: smartsite._id,
        title: title.trim(),
        headline: headline.trim(),
        description: body,
        image: imageUrl,
        category: category.trim() || "General",
        status,
        scheduledAt: status === "scheduled" ? new Date(scheduledAt).toISOString() : null,
      };
      const result = editingId
        ? await updateBlog({ ...payload, _id: editingId }, token)
        : await postBlog(payload, token);
      if (result?.state !== "success") throw new Error(result?.message || "Save failed");
      toast.success(editingId ? "Post updated" : "Post created");
      onCloseModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save post");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (post: BlogPost) => {
    if (!post._id || !window.confirm(`Delete “${post.title || "post"}”?`)) return;
    const result = await deleteBlog({ _id: post._id, micrositeId: smartsite._id }, token);
    if (result?.state === "success") {
      toast.success("Post deleted");
      onCloseModal();
    } else toast.error("Could not delete post");
  };

  if (!composerOpen) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <div><h2 className="text-xl font-bold text-gray-950">Blog posts</h2><p className="text-sm text-gray-500">Draft, schedule, publish, and review performance.</p></div>
          <button type="button" onClick={newPost} className="flex items-center gap-1.5 rounded-full bg-gray-950 px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> New post</button>
        </div>
        {posts.length === 0 ? (
          <button type="button" onClick={newPost} className="rounded-2xl border border-dashed border-gray-300 px-6 py-14 text-sm font-semibold text-gray-500">Create your first post</button>
        ) : posts.map((post) => (
          <div key={post._id} className="flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-white p-3">
            <div className="relative h-16 w-20 flex-none overflow-hidden rounded-xl bg-gray-100">{post.image && <Image src={post.image} alt="" fill className="object-cover" />}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-gray-950">{post.title || "Untitled"}</p><div className="mt-1 flex items-center gap-2"><StatusBadge post={post} /><span className="flex items-center gap-1 text-xs text-gray-500"><Eye size={12} /> {post.totalTap || 0}</span></div></div>
            <button type="button" onClick={() => editPost(post)} aria-label="Edit post" className="rounded-full p-2 hover:bg-gray-100"><Edit3 size={17} /></button>
            <div className="group relative"><button type="button" aria-label="More post actions" className="rounded-full p-2 hover:bg-gray-100"><MoreHorizontal size={18} /></button><div className="invisible absolute right-0 top-full z-20 w-36 rounded-xl border bg-white p-1 opacity-0 shadow-lg group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"><button type="button" onClick={() => remove(post)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 size={14} /> Delete</button></div></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">{editingId ? "Edit post" : "New post"}</h2><p className="text-sm text-gray-500">Compose and publish to your SmartSite.</p></div><button type="button" onClick={() => setComposerOpen(false)} className="text-sm font-semibold text-gray-500">Back to posts</button></div>
      <label className="relative flex min-h-52 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50">{imageFile || image ? <Image src={imageFile || image} alt="Cover" fill className="object-cover" /> : <span className="text-sm font-semibold text-gray-500">Add cover image</span>}<span className="absolute rounded-full bg-white/90 px-4 py-2 text-xs font-bold shadow"><CustomFileInput handleFileChange={handleFileChange} /></span></label>
      <label><span className="mb-1 block text-xs font-bold text-gray-500">Title</span><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Post title" /></label>
      <div className="grid grid-cols-2 gap-3"><label><span className="mb-1 block text-xs font-bold text-gray-500">Category</span><input className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)} /></label><label><span className="mb-1 block text-xs font-bold text-gray-500">Status</span><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as PostStatus)}><option value="published">Published</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option></select></label></div>
      {status === "scheduled" && <label><span className="mb-1 block text-xs font-bold text-gray-500">Publish date</span><input type="datetime-local" className={inputClass} value={scheduledAt} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setScheduledAt(event.target.value)} /></label>}
      <label><span className="mb-1 block text-xs font-bold text-gray-500">Excerpt</span><textarea className={`${inputClass} min-h-20 resize-none`} value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Short summary shown on the card" /></label>
      <div><span className="mb-1 block text-xs font-bold text-gray-500">Body</span><Editor apiKey="njethe5lk1z21je67jjdi9v3wimfducwhl6jnnuip46yxwxh" value={body} onEditorChange={setBody} init={{ height: 320, menubar: false, plugins: ["autolink", "lists", "link", "blockquote", "code"], toolbar: "undo redo | bold italic underline | link | alignleft aligncenter alignright | bullist numlist | blockquote | code" }} /></div>
      <PrimaryButton className="w-full py-3" disabled={saving}>{saving ? <Loader className="mx-auto h-5 w-5 animate-spin" /> : editingId ? "Save changes" : "Save post"}</PrimaryButton>
    </form>
  );
};

function StatusBadge({ post }: { post: BlogPost }) {
  const status = post.status || "published";
  const tone = status === "published" ? "bg-emerald-50 text-emerald-700" : status === "scheduled" ? "bg-violet-50 text-violet-700" : "bg-gray-100 text-gray-600";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${tone}`}>{status}</span>;
}

export default AddBlog;
