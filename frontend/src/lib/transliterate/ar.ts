/** Latin -> Arabic script, phonetic letter mapping.
 *
 * Follows the informal "Arabizi" chat convention: digraphs for sounds with
 * no single Latin letter (sh -> ش, kh -> خ, gh -> غ), Buckwalter-style
 * capitals for emphatics (S -> ص, T -> ط), and the widely used digit
 * substitutions (3 -> ع, 7 -> ح, 2 -> ء). Short vowels map to their long
 * counterparts (a -> ا etc.) since the script normally omits them --
 * approximate, but readable, and shaping/joining is handled by the browser.
 */

const DIGRAPHS: Record<string, string> = {
  sh: "ش",
  th: "ث",
  kh: "خ",
  dh: "ذ",
  gh: "غ",
  aa: "ا",
  ee: "ي",
  ou: "و",
};

const SINGLE: Record<string, string> = {
  // Buckwalter-style capitals for emphatic/pharyngeal letters
  H: "ح", S: "ص", D: "ض", T: "ط", Z: "ظ",
  a: "ا", b: "ب", c: "ك", d: "د", e: "ي", f: "ف", g: "ج", h: "ه",
  i: "ي", j: "ج", k: "ك", l: "ل", m: "م", n: "ن", o: "و", p: "ب",
  q: "ق", r: "ر", s: "س", t: "ت", u: "و", v: "ف", w: "و", x: "كس",
  y: "ي", z: "ز",
  // Arabizi digit conventions
  "2": "ء", "3": "ع", "5": "خ", "6": "ط", "7": "ح", "8": "غ", "9": "ق",
  "'": "ء",
};

export function latinToArabic(word: string): string {
  let out = "";
  let i = 0;
  while (i < word.length) {
    const two = word.slice(i, i + 2).toLowerCase();
    if (DIGRAPHS[two]) {
      out += DIGRAPHS[two];
      i += 2;
      continue;
    }
    const c = word[i];
    out += SINGLE[c] ?? SINGLE[c.toLowerCase()] ?? c;
    i += 1;
  }
  return out;
}
