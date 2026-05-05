// https://www.npmjs.com/package/rosaenlg-n2words

type LanguageMenuProps = {
  selectOption: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

const LanguageMenu = ({ selectOption }: LanguageMenuProps) => {
  const languageCodes = {
    English: "en",
    "Chinese (Simplified)": "zh",
    Spanish: "es",
    French: "fr",
    Arabic: "ar",
    Russian: "ru",
    Portugese: "pt",
    Indonesian: "id",
    German: "de",
    "Japanese (Kanji)": "ja",
    "Korean (Sino)": "ko",
  };

  return (
    <div className="absolute mt-3 flex w-full flex-col rounded border border-sub-color text-2xl">
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
