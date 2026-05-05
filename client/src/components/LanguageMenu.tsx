type LanguageMenuProps = {
  selectOption: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  currentLocale: string;
};

const LanguageMenu = ({ selectOption, currentLocale }: LanguageMenuProps) => {
  const languageCodes = {
    Arabic: "ar",
    Azerbaijani: "az",
    Bengali: "bn",
    "Chinese (Simplified)": "zh",
    Croatian: "hr",
    Czech: "cs",
    Danish: "da",
    Dutch: "nl",
    English: "en",
    French: "fr",
    German: "de",
    Greek: "el",
    Gujarati: "gu",
    Hebrew: "he",
    Hindi: "hi",
    Hungarian: "hu",
    Indonesian: "id",
    Italian: "it",
    "Japanese (Kanji)": "ja",
    Kannada: "kn",
    "Korean (Sino)": "ko",
    Lithuanian: "lt",
    Malay: "ms",
    Norwegian: "nb",
    Persian: "fa",
    Polish: "pl",
    Portuguese: "pt",
    Punjabi: "pa-Guru",
    Romanian: "ro",
    Russian: "ru",
    "Serbian (Latin)": "sr-Latn",
    Spanish: "es",
    Swahili: "sw",
    Swedish: "sv",
    Tamil: "ta",
    Telugu: "te",
    Thai: "th",
    Turkish: "tr",
    Ukrainian: "uk",
    Urdu: "ur",
    Vietnamese: "vi",
  };

  return (
    <div className="border-sub-color bg-sub-color divide-bg-color/40 absolute left-1/2 z-10 mt-3 flex max-h-96 w-64 -translate-x-1/2 flex-col divide-y overflow-y-auto rounded border text-xl shadow-lg">
      {Object.entries(languageCodes).map(([language, code]) => {
        const isSelected = code === currentLocale;
        return (
          <a
            key={code}
            id={code}
            className={`hover:bg-bg-color hover:text-accent cursor-pointer px-4 py-1.5 transition-colors ${
              isSelected ? "text-accent" : "text-text-accent"
            }`}
            onClick={selectOption}
          >
            {language}
          </a>
        );
      })}
    </div>
  );
};

export default LanguageMenu;
