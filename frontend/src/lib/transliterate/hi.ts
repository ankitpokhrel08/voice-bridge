/** Latin -> Devanagari, ITRANS-flavored phonetic scheme.
 *
 * Devanagari is an abugida: each consonant carries an inherent "a"; other
 * vowels attach as matras (dependent signs), and consonant clusters join
 * with a virama. So the engine is stateful -- a vowel renders differently
 * depending on whether it follows a consonant ("na" -> न) or stands alone
 * ("aam" -> आम), and back-to-back consonants get a virama between them
 * ("namaste" -> न म स् ते -> नमस्ते).
 *
 * Case matters: capitals give retroflex consonants (T -> ट vs t -> त) and
 * long vowels (A -> आ), following ITRANS convention.
 */

// [independent form, matra (dependent) form]
const VOWELS: Record<string, [string, string]> = {
  a: ["अ", ""],
  aa: ["आ", "ा"], A: ["आ", "ा"],
  i: ["इ", "ि"],
  ii: ["ई", "ी"], ee: ["ई", "ी"], I: ["ई", "ी"],
  u: ["उ", "ु"],
  uu: ["ऊ", "ू"], oo: ["ऊ", "ू"], U: ["ऊ", "ू"],
  e: ["ए", "े"],
  ai: ["ऐ", "ै"],
  o: ["ओ", "ो"],
  au: ["औ", "ौ"],
};

const CONSONANTS: Record<string, string> = {
  chh: "छ", Chh: "छ",
  kh: "ख", gh: "घ", ch: "च", jh: "झ",
  Th: "ठ", Dh: "ढ",
  th: "थ", dh: "ध", ph: "फ", bh: "भ",
  sh: "श", Sh: "ष",
  gy: "ज्ञ",
  k: "क", g: "ग", j: "ज",
  T: "ट", D: "ड", N: "ण",
  t: "त", d: "द", n: "न",
  p: "प", b: "ब", m: "म",
  y: "य", r: "र", l: "ल", v: "व", w: "व",
  S: "ष", s: "स", h: "ह",
  f: "फ़", z: "ज़", q: "क़", x: "क्स", c: "क",
  M: "ं",
};

const VIRAMA = "्";

function isVowelStart(char: string): boolean {
  return "aiueoAIUEO".includes(char);
}

export function latinToDevanagari(word: string): string {
  let out = "";
  let i = 0;
  let prevWasConsonant = false;

  while (i < word.length) {
    const c = word[i];

    if (isVowelStart(c)) {
      let entry: [string, string] | undefined;
      let len = 0;
      for (const tryLen of [2, 1]) {
        const candidate = VOWELS[word.slice(i, i + tryLen)];
        if (candidate) {
          entry = candidate;
          len = tryLen;
          break;
        }
      }
      if (entry) {
        out += prevWasConsonant ? entry[1] : entry[0];
        i += len;
        prevWasConsonant = false;
        continue;
      }
    } else {
      let glyph: string | undefined;
      let len = 0;
      for (const tryLen of [3, 2, 1]) {
        const candidate = CONSONANTS[word.slice(i, i + tryLen)];
        if (candidate) {
          glyph = candidate;
          len = tryLen;
          break;
        }
      }
      if (glyph) {
        // Anusvara is a sign, not a consonant -- it never forms a cluster.
        if (glyph === "ं") {
          out += glyph;
          prevWasConsonant = false;
        } else {
          if (prevWasConsonant) out += VIRAMA;
          out += glyph;
          prevWasConsonant = true;
        }
        i += len;
        continue;
      }
    }

    out += c;
    prevWasConsonant = false;
    i += 1;
  }

  return out;
}
