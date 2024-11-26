import { StaticImageData } from "next/image";

export interface IconMap {
  "Social Media": string | StaticImageData;
  "Chat Links": string | StaticImageData;
  Commands: string | StaticImageData;
}

export type SelectedIconType = "Social Media" | "Chat Links" | "Commands";
export interface AppIconMap {
  Link: string | StaticImageData;
  "Call To Action": string | StaticImageData;
}

export type AppSelectedIconType = "Link" | "Call To Action";
