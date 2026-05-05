type LanguageMenuProps = {
  selectOption: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

const LanguageMenu = ({ selectOption }: LanguageMenuProps) => {
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
    <div className="absolute mt-3 flex max-h-96 w-full flex-col overflow-y-auto rounded border border-sub-color text-2xl">
      {Object.entries(languageCodes).map(([language, code], i) => (
        <a
          key={i}
          id={code}
          className={`cursor-pointer py-1 hover:text-white ${
            i % 2 ? "bg-bg-color" : "bg-sub-color"
          }`}
          onClick={selectOption}
        >
          {language}
        </a>
      ))}
    </div>
  );
};

export default LanguageMenu;
