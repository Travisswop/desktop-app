"use client";

import Image from "next/image";
import { Play } from "lucide-react";

type Media = { id: string; url: string; type: "photo" | "video" };
type Carousel = { id: string; name: string; items: Media[] };
export default function MediaCarouselCard({ config }: { config: { carousels?: Carousel[] }; mode?: "public" | "builder" }) {
  return <section className="flex flex-col gap-5 rounded-[24px] border border-black/10 bg-white py-5 shadow-sm">{(config.carousels || []).map((carousel) => <div key={carousel.id}><h3 className="px-5 text-lg font-black">{carousel.name}</h3><div className="mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-1">{carousel.items.map((item) => <div key={item.id} className="relative aspect-[4/3] w-52 flex-none snap-start overflow-hidden rounded-2xl bg-gray-100">{item.type === "video" ? <video src={item.url} className="h-full w-full object-cover" controls /> : <Image src={item.url} alt="" fill className="object-cover" />}{item.type === "video" ? <span className="pointer-events-none absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"><Play size={15} /></span> : null}</div>)}</div></div>)}</section>;
}
