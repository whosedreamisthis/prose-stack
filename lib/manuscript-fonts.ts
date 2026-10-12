import {
  Atkinson_Hyperlegible,
  Cousine,
  Courier_Prime,
  Crimson_Pro,
  EB_Garamond,
  Libre_Baskerville,
  Lora,
  Merriweather,
  Open_Sans,
  Source_Serif_4,
} from "next/font/google";

// Self-hosted at build time. `preload: false` keeps them off every page's critical path: a font file is only fetched
// when text actually uses it. The variable names match the `css` values in `FONTS` (lib/project-config.ts). Next.js
// reads these options at build time, so each call spells them out instead of sharing an object.
const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  style: ["normal", "italic"],
});
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  style: ["normal", "italic"],
});
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  style: ["normal", "italic"],
});
const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  style: ["normal", "italic"],
});
const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  style: ["normal", "italic"],
});
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  style: ["normal", "italic"],
});
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  style: ["normal", "italic"],
});
const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  style: ["normal", "italic"],
});
const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  style: ["normal", "italic"],
});
const cousine = Cousine({
  variable: "--font-cousine",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

/** Class names that define every manuscript font's CSS variable; put them on <html>. */
export const manuscriptFontVariables = [
  libreBaskerville,
  lora,
  merriweather,
  ebGaramond,
  crimsonPro,
  sourceSerif,
  openSans,
  atkinson,
  courierPrime,
  cousine,
]
  .map((f) => f.variable)
  .join(" ");
