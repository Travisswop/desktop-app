"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Cookies from "js-cookie";
import { CalendarDays, Search, Share2, UserPlus, X } from "lucide-react";
import { postConnectSmartsite } from "@/actions/connectMicrosite";

type BlogPost = {
  _id: string;
  title: string;
  headline: string;
  description: string;
  image: string;
  category?: string;
  status?: "published" | "draft" | "scheduled";
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
};

const loadedAt = Date.now();

export default function Blog({ posts, parentId, micrositeId, authorName, authorHandle, authorImage }: {
  posts: BlogPost[];
  parentId: string;
  micrositeId: string;
  authorName: string;
  authorHandle: string;
  authorImage?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [following, setFollowing] = useState(false);
  const published = useMemo(() => posts.filter((post) => !post.status || post.status === "published" || (post.status === "scheduled" && post.scheduledAt && new Date(post.scheduledAt).getTime() <= loadedAt)), [posts]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(published.map((post) => post.category || "General")))], [published]);
  const filtered = published.filter((post) => (category === "All" || (post.category || "General") === category) && (!query.trim() || `${post.title} ${post.headline}`.toLowerCase().includes(query.trim().toLowerCase())));

  const open = (post: BlogPost) => {
    setSelected(post);
    void fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/web/updateCount`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ socialType: "blog", socialId: post._id, parentId }) });
  };

  const follow = async () => {
    const userId = Cookies.get("user-id");
    const token = Cookies.get("access-token");
    if (!userId || !token) return;
    const result = await postConnectSmartsite({ pId: parentId, cId: micrositeId, userId }, token);
    if (result?.state === "success") setFollowing(true);
  };

  return (
    <section className="w-full rounded-[24px] border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2"><Search size={15} className="text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posts" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`flex-none rounded-full px-3 py-1.5 text-xs font-bold ${category === item ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-500"}`}>{item}</button>)}</div>
      <div className="mt-4 grid grid-cols-2 gap-3">{filtered.map((post) => <button key={post._id} type="button" onClick={() => open(post)} className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="relative aspect-[4/3] bg-gray-100">{post.image && <Image src={post.image} alt="" fill className="object-cover" />}</div><div className="p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{post.category || "General"}</p><h3 className="mt-1 line-clamp-2 text-sm font-bold text-gray-950">{post.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-4 text-gray-500">{post.headline}</p></div></button>)}</div>
      {filtered.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No matching posts.</p>}

      {selected && <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><article className="mx-auto my-8 max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl"><div className="relative aspect-[16/8] bg-gray-100">{selected.image && <Image src={selected.image} alt="" fill className="object-cover" />}<button type="button" onClick={() => setSelected(null)} className="absolute right-4 top-4 rounded-full bg-white/90 p-2 shadow"><X size={18} /></button></div><div className="p-6 md:p-8"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400"><span>{selected.category || "General"}</span><span>·</span><CalendarDays size={13} /><span>{formatDate(selected.publishedAt || selected.createdAt)}</span></div><h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950">{selected.title}</h1><p className="mt-2 text-base font-medium text-gray-500">{selected.headline}</p><div className="my-6 flex items-center gap-3 border-y py-4">{authorImage && <div className="relative h-10 w-10 overflow-hidden rounded-full"><Image src={authorImage} alt="" fill className="object-cover" /></div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{authorName}</p><p className="truncate text-xs text-gray-500">{authorHandle}</p></div><button type="button" onClick={follow} disabled={following} className="flex items-center gap-1.5 rounded-full bg-gray-950 px-4 py-2 text-xs font-bold text-white disabled:bg-gray-200 disabled:text-gray-500"><UserPlus size={14} />{following ? "Following" : "Follow"}</button></div><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selected.description }} /><button type="button" onClick={() => navigator.share?.({ title: selected.title, url: window.location.href })} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 text-sm font-bold"><Share2 size={16} /> Share post</button></div></article></div>}
    </section>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Recent";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recent" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
