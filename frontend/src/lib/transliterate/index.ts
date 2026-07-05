/** Per-language typing helpers for the chat composer.
 *
 * Two kinds:
 * - "transliterate": phonetic input for non-Latin scripts -- type Latin,
 *   words convert to native script on word boundaries (Hindi, Arabic,
 *   Japanese kana). Chinese is deliberately absent: pinyin -> hanzi needs a
 *   dictionary-backed IME, so zh users rely on their OS keyboard.
 * - "accents": a tap-to-insert row of the special characters a Latin-script
 *   language needs beyond a plain QWERTY keyboard.
 */

import { latinToDevanagari } from "./hi";
import { latinToArabic } from "./ar";
import { romajiToHiragana } from "./ja";

export interface TransliterateHelper {
  kind: "transliterate";
  /** Short native-script sample shown on the toggle button, e.g. "अ". */
  scriptLabel: string;
  /** Human-readable name of the phonetic scheme, for the composer hint. */
  schemeName: string;
  /** Example Latin input shown in the placeholder, e.g. "namaste". */
  sample: string;
  convertWord: (word: string) => string;
}

export interface AccentHelper {
  kind: "accents";
  chars: string[];
}

export type InputHelper = TransliterateHelper | AccentHelper;

const HELPERS: Record<string, InputHelper> = {
  hi: { kind: "transliterate", scriptLabel: "अ", schemeName: "Hindi phonetic", sample: "namaste", convertWord: latinToDevanagari },
  ar: { kind: "transliterate", scriptLabel: "ع", schemeName: "Arabic phonetic", sample: "marhaba", convertWord: latinToArabic },
  ja: { kind: "transliterate", scriptLabel: "あ", schemeName: "Romaji", sample: "konnichiwa", convertWord: romajiToHiragana },
  es: { kind: "accents", chars: ["á", "é", "í", "ó", "ú", "ü", "ñ", "¿", "¡"] },
  fr: { kind: "accents", chars: ["à", "â", "ç", "é", "è", "ê", "ë", "î", "ï", "ô", "œ", "ù", "û"] },
  de: { kind: "accents", chars: ["ä", "ö", "ü", "ß"] },
  pt: { kind: "accents", chars: ["á", "â", "ã", "à", "ç", "é", "ê", "í", "ó", "ô", "õ", "ú"] },
};

export function getInputHelper(languageCode: string): InputHelper | null {
  return HELPERS[languageCode] ?? null;
}

/** Convert every Latin-letter run in `text` to native script, leaving
 * already-converted (non-Latin) text and pure numbers untouched. Safe to
 * run repeatedly: converted output contains no Latin letters. Digits are
 * included in runs so Arabizi digit conventions (3 -> ع) work, but a run
 * with no letters at all (a plain number) is left alone. */
export function convertLatinChunks(text: string, convertWord: (word: string) => string): string {
  return text.replace(/[A-Za-z0-9']+/g, (chunk) => (/[A-Za-z]/.test(chunk) ? convertWord(chunk) : chunk));
}

/** The trailing still-Latin word at the end of `text`, for the live
 * conversion preview ("" if the text doesn't end in a Latin run). */
export function trailingLatinChunk(text: string): string {
  const match = /[A-Za-z0-9']+$/.exec(text);
  return match && /[A-Za-z]/.test(match[0]) ? match[0] : "";
}
