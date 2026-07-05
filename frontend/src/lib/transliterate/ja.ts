/** Romaji -> hiragana, standard IME-style mapping with sokuon (double
 * consonant -> っ) and syllabic n handling. Deterministic -- no dictionary
 * needed, unlike pinyin -> hanzi, which is why Japanese gets a built-in
 * phonetic keyboard and Chinese does not. */

const KANA: Record<string, string> = {
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  sa: "さ", shi: "し", si: "し", su: "す", se: "せ", so: "そ",
  za: "ざ", ji: "じ", zi: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  ta: "た", chi: "ち", ti: "ち", tsu: "つ", tu: "つ", te: "て", to: "と",
  da: "だ", di: "ぢ", du: "づ", de: "で", do: "ど",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", fu: "ふ", hu: "ふ", he: "へ", ho: "ほ",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wo: "を",
  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ",
  ja: "じゃ", ju: "じゅ", jo: "じょ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ",
  va: "ゔぁ", vi: "ゔぃ", vu: "ゔ", ve: "ゔぇ", vo: "ゔぉ",
  "-": "ー",
};

const SOKUON_CONSONANTS = "bcdfghjkpqrstvwz";

export function romajiToHiragana(word: string): string {
  const s = word.toLowerCase();
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];

    // Doubled consonant (kk, tt, pp, ...) -> small tsu + the consonant's kana.
    if (i + 1 < s.length && c === s[i + 1] && SOKUON_CONSONANTS.includes(c)) {
      out += "っ";
      i += 1;
      continue;
    }

    if (c === "n") {
      const next = s[i + 1];
      if (next === "'") {
        out += "ん";
        i += 2;
        continue;
      }
      if (next === "n") {
        // "nni" -> んに (second n starts the next syllable); bare "nn" -> ん.
        out += "ん";
        i += "aiueoy".includes(s[i + 2] ?? "") ? 1 : 2;
        continue;
      }
      if (next === undefined || !"aiueoy".includes(next)) {
        out += "ん";
        i += 1;
        continue;
      }
    }

    let matched = false;
    for (const len of [3, 2, 1]) {
      const kana = KANA[s.slice(i, i + len)];
      if (kana) {
        out += kana;
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += s[i];
      i += 1;
    }
  }
  return out;
}
