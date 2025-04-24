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
  "Custom Image": string | StaticImageData;
}
export type AppSelectedIconType = "Link" | "Call To Action" | "Custom Image";
export interface InfoBarIconMap {
  Link: string | StaticImageData;
  "Call To Action": string | StaticImageData;
  "Product Link": string | StaticImageData;
  "Contact Card": string | StaticImageData;
  "Upload Custom Image": string | StaticImageData;
}
export type InfoBarSelectedIconType =
  | "Link"
  | "Call To Action"
  | "Product Link"
  | "Upload Custom Image"
  | "Contact Card";
