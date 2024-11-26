import { StaticImageData } from "next/image";
import { ReactNode } from "react";

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
export interface InfoBarIconMap {
  Link: string | StaticImageData;
  "Call To Action": string | StaticImageData;
  "Product Link": string | StaticImageData;
  "Contact Card": string | StaticImageData;
}
export type InfoBarSelectedIconType =
  | "Link"
  | "Call To Action"
  | "Product Link"
  | "Contact Card";
