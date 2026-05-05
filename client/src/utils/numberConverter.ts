import { toCardinal as zhHans } from "n2words/zh-Hans-CN";
import { toCardinal as ar } from "n2words/ar-SA";
import { toCardinal as az } from "n2words/az-AZ";
import { toCardinal as bn } from "n2words/bn-BD";
import { toCardinal as cs } from "n2words/cs-CZ";
import { toCardinal as da } from "n2words/da-DK";
import { toCardinal as de } from "n2words/de-DE";
import { toCardinal as el } from "n2words/el-GR";
import { toCardinal as en } from "n2words/en-US";
import { toCardinal as es } from "n2words/es-ES";
import { toCardinal as fa } from "n2words/fa-IR";
import { toCardinal as fr } from "n2words/fr-FR";
import { toCardinal as gu } from "n2words/gu-IN";
import { toCardinal as he } from "n2words/he-IL";
import { toCardinal as hi } from "n2words/hi-IN";
import { toCardinal as hr } from "n2words/hr-HR";
import { toCardinal as hu } from "n2words/hu-HU";
import { toCardinal as id } from "n2words/id-ID";
import { toCardinal as it } from "n2words/it-IT";
import { toCardinal as ja } from "n2words/ja-JP";
import { toCardinal as kn } from "n2words/kn-IN";
import { toCardinal as ko } from "n2words/ko-KR";
import { toCardinal as lt } from "n2words/lt-LT";
import { toCardinal as ms } from "n2words/ms-MY";
import { toCardinal as nb } from "n2words/nb-NO";
import { toCardinal as nl } from "n2words/nl-NL";
import { toCardinal as pa } from "n2words/pa-IN";
import { toCardinal as pl } from "n2words/pl-PL";
import { toCardinal as pt } from "n2words/pt-PT";
import { toCardinal as ro } from "n2words/ro-RO";
import { toCardinal as ru } from "n2words/ru-RU";
import { toCardinal as srLatn } from "n2words/sr-Latn-RS";
import { toCardinal as sv } from "n2words/sv-SE";
import { toCardinal as sw } from "n2words/sw-KE";
import { toCardinal as ta } from "n2words/ta-IN";
import { toCardinal as te } from "n2words/te-IN";
import { toCardinal as th } from "n2words/th-TH";
import { toCardinal as tr } from "n2words/tr-TR";
import { toCardinal as uk } from "n2words/uk-UA";
import { toCardinal as ur } from "n2words/ur-PK";
import { toCardinal as vi } from "n2words/vi-VN";

const fixUk = (s: string) => s.replace(/i/g, "і");
const fixNb = (s: string) => s.replace(/-/g, "");
const fixSv = (s: string) => s.replace(/-/g, "").replace(/ och /g, "");

const cardinal: Record<string, (n: number) => string> = {
  ar,
  az,
  bn,
  cs,
  da,
  de,
  el,
  en,
  es,
  fa,
  fr,
  gu,
  he,
  hi,
  hr,
  hu,
  id,
  it,
  ja,
  kn,
  ko,
  lt,
  ms,
  nb: (n) => fixNb(nb(n)),
  nl,
  "pa-Guru": pa,
  pl,
  pt,
  ro,
  ru,
  "sr-Latn": srLatn,
  sv: (n) => fixSv(sv(n)),
  sw,
  ta,
  te,
  th,
  tr,
  uk: (n) => fixUk(uk(n)),
  ur,
  vi,
};

export const numToString = (n: number, locale: string): string => {
  if (locale === "zh") return convertChinese(n);
  const fn = cardinal[locale];
  if (!fn) throw new Error(`Unsupported locale: ${locale}`);
  return fn(n);
};

const convertChinese = (n: number): string => {
  let s = zhHans(n, { formal: false });
  if (n < 100) s = s.replace("一十", "十");
  if (n > 100 && s[0] === "二") s = "两" + s.slice(1);
  return s;
};
