import Link from "next/link";

const Navbar = () => (
  <header className="mx-auto flex w-full max-w-5xl px-6 pt-6 sm:px-10">
    <Link
      href="/"
      className="font-display text-paper text-2xl font-semibold tracking-tight"
    >
      Numlingo
    </Link>
  </header>
);

export default Navbar;
