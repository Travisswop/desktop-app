import { StaticImageData } from "next/image";

export interface IconMap {
  "Social Media": string | StaticImageData;
  "Chat Links": string | StaticImageData;
  Commands: string | StaticImageData;
}

export type SelectedIconType = "Social Media" | "Chat Links" | "Commands";
