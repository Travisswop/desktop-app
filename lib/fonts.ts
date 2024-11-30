// fonts.ts
import {
  Roboto,
  Poppins,
  Open_Sans,
  Montserrat,
  Rubik,
} from "next/font/google";

export type FontType =
  | "roboto"
  | "poppins"
  | "opensans"
  | "montserrat"
  | "rubik";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "700"],
});
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "700"],
});
const rubik = Rubik({ subsets: ["latin"], weight: ["400", "700"] });

export const fontMap: any = {
  roboto: roboto.className,
  poppins: poppins.className,
  opensans: openSans.className,
  montserrat: montserrat.className,
  rubik: rubik.className,
};