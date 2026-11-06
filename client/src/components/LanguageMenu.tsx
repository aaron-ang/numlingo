import { LANGUAGES } from "@/utils/languages";

type LanguageMenuProps = {
  selectOption: (locale: string) => void;
  currentLocale: string;
};

const LanguageMenu = ({ selectOption, currentLocale }: LanguageMenuProps) => (
  <div
    id="language-menu"
    className="border-line bg-slate absolute top-full left-1/2 z-10 mt-3 grid max-h-[60svh] w-[min(36rem,calc(100vw-3rem))] -translate-x-1/2 grid-cols-2 gap-x-2 overflow-y-auto rounded-2xl border p-3 shadow-2xl shadow-black/40 sm:grid-cols-3"
  >
    {Object.entries(LANGUAGES).map(([language, code]) => {
      const isSelected = code === currentLocale;
      return (
        <button
          key={code}
          type="button"
          data-locale={code}
          aria-current={isSelected ? "true" : undefined}
          className={`hover:bg-ink rounded-lg px-3 py-1.5 text-left text-base transition-colors ${
            isSelected ? "text-saffron" : "text-paper"
          }`}
          onClick={() => selectOption(code)}
        >
          {language}
        </button>
      );
    })}
  </div>
);

export default LanguageMenu;
