import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Literata } from "next/font/google";

import "./globals.css";
import Navbar from "../components/Navbar";

const literata = Literata({
  subsets: ["latin", "latin-ext", "cyrillic", "greek", "vietnamese"],
  axes: ["opsz"],
  variable: "--font-literata",
});

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  title: "Numlingo",
  description:
    "Read numbers written out in 41 languages and type the digits against the clock. Play solo or race up to three friends.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${literata.variable} ${atkinson.variable}`}>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
