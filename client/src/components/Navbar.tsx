import Link from "next/link";

const Navbar = () => {
  const options = {
    About: "/about",
    Settings: "/settings",
    Feedback: "/feedback",
  };

  return (
    <nav className="bg-transparent pt-3">
      <div className="mx-auto flex max-w-(--breakpoint-xl) flex-wrap items-center justify-between px-8">
        <Link
          href="/"
          className="self-center whitespace-nowrap px-3 py-2 text-3xl font-semibold text-text-accent"
        >
          Numlingo
        </Link>

        <button
          data-collapse-toggle="navbar-default"
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 md:hidden"
          aria-controls="navbar-default"
          aria-expanded="false"
        >
          <span className="sr-only">Open main menu</span>
          <svg
            className="h-5 w-5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 17 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M1 1h15M1 7h15M1 13h15"
            />
          </svg>
        </button>

        <div className="hidden w-full md:block md:w-auto" id="navbar-default">
          <ul className="mt-2 flex flex-col rounded-lg font-medium md:mt-0 md:flex-row md:space-x-4">
            {Object.entries(options).map(([key, value]) => (
              <li key={key}>
                <a
                  href={value}
                  className="block rounded px-3 py-2 text-xl text-sub-color hover:bg-sub-color hover:text-accent md:text-2xl"
                >
                  {key}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
