import n2words, { type LanguageCode } from "n2words";
import { number2kanji } from "@geolonia/japanese-numeral";

export const numToString = (n: number, locale: string): string => {
  switch (locale) {
    case "zh":
      return convertChinese(n);
    case "ja":
      return number2kanji(n);
    default:
      return n2words(n, { lang: locale as LanguageCode });
  }
};

const convertChinese = (n: number): string => {
  // https://stackoverflow.com/a/59368940

  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const positions = ["", "十", "百", "千", "万", "十万", "百万", "千万", "亿"];
  const charArray = String(n).split("");
  let result = "";
  let prevIsZero = false;

  // deal zero
  for (let i = 0; i < charArray.length; i++) {
    const ch = charArray[i];
    if (ch !== "0" && !prevIsZero) {
      result += digits[parseInt(ch)] + positions[charArray.length - i - 1];
    } else if (ch === "0") {
      prevIsZero = true;
    } else if (ch !== "0" && prevIsZero) {
      result +=
        "零" + digits[parseInt(ch)] + positions[charArray.length - i - 1];
    }
  }
  // deal ten
  if (n < 100) {
    result = result.replace("一十", "十");
  }
  if (n > 100 && result[0] === "二") {
    result = "两" + result.slice(1);
  }
  return result;
};

const convertKorean = (n: number): string => {
  // https://github.com/rkdqudtjs1/number-translate-to-korean/blob/master/index.js

  const resultValue = [];
  const unit1 = ["", "만", "억", "조"];
  const unit2 = ["", "십", "백", "천", "만"];
  const numData = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

  const valueStr = n.toString();
  const unit1Size = Math.ceil(valueStr.length / 4);

  const splitReverse = valueStr.split("").reverse();

  for (let i = 0; i < unit1Size; i++) {
    const number = splitReverse.splice(0, 4);
    let result = number
      .map((num, idx) =>
        num !== "0" ? numData[parseInt(num)] + unit2[idx] : "",
      )
      .reverse()
      .join("");
    if (result) result += unit1[i];
    resultValue.unshift(result);
  }
  return resultValue.join("");
};
