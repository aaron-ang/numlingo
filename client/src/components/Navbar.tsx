"use client";

import Link from "next/link";

import { goHome } from "@/utils/home";

const Navbar = () => (
  <header className="mx-auto flex w-full max-w-5xl px-6 pt-6 sm:px-10">
    <Link
      href="/"
      onClick={(e) => {
        // A modified click opens a new tab; leave this tab's game alone.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        goHome();
      }}
      className="font-display text-paper text-2xl font-semibold tracking-tight"
    >
      Numlingo
    </Link>
  </header>
);

export default Navbar;
