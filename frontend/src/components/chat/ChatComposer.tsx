import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { convertLatinChunks, getInputHelper, trailingLatinChunk } from "../../lib/transliterate";
import styles from "./ChatComposer.module.css";

interface ChatComposerProps {
  disabled: boolean;
  /** The user's preferred language -- selects the typing helper (phonetic
   * native-script input or an accent-character row). */
  languageCode: string;
  onSend: (text: string) => boolean;
}

/** Word-boundary transliteration, Google-Input-Tools style: type Latin
 * phonetically, and each word converts to native script when you close it
 * with a space or punctuation (or on send). Already-converted text contains
 * no Latin letters, so re-running the conversion is always safe. Conversion
 * only fires while the cursor is at the end of the input, so mid-text edits
 * never yank the cursor around. */
export function ChatComposer({ disabled, languageCode, onSend }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const [nativeInput, setNativeInput] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const helper = useMemo(() => getInputHelper(languageCode), [languageCode]);
  const translit = helper?.kind === "transliterate" && nativeInput ? helper : null;

  const convertAll = (text: string) => (translit ? convertLatinChunks(text, translit.convertWord) : text);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    let next = event.target.value;
    const cursorAtEnd = event.target.selectionStart === next.length;
    if (translit && cursorAtEnd && /[\s.,!?;:]$/.test(next)) {
      next = convertAll(next);
    }
    setValue(next);
  };

  const send = () => {
    const text = convertAll(value).trim();
    if (!text) return;
    if (onSend(text)) setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      send();
    }
  };

  const insertChar = (char: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + char + value.slice(end));
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(start + char.length, start + char.length);
      }
    });
  };

  const previewSource = translit ? trailingLatinChunk(value) : "";
  const placeholder = disabled
    ? "Chat is available during a call"
    : translit
      ? `Type phonetically -- try "${translit.sample}"`
      : "Type a message";

  return (
    <div className={styles.composer}>
      {helper?.kind === "accents" && !disabled && (
        <div className={styles.accentRow} aria-label="Special characters">
          {helper.chars.map((char) => (
            <button
              key={char}
              type="button"
              className={styles.accentKey}
              // preventDefault on mousedown keeps focus (and cursor position) in the input
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertChar(char)}
            >
              {char}
            </button>
          ))}
        </div>
      )}

      {previewSource && (
        <div className={styles.previewRow} aria-live="polite">
          <span className={styles.previewSource}>{previewSource}</span>
          <span className={styles.previewArrow}>→</span>
          <span className={styles.previewTarget} dir="auto">
            {translit!.convertWord(previewSource)}
          </span>
          <span className={styles.previewHint}>space converts</span>
        </div>
      )}

      <div className={styles.inputRow}>
        {helper?.kind === "transliterate" && (
          <button
            type="button"
            className={styles.scriptToggle}
            data-active={nativeInput || undefined}
            onClick={() => setNativeInput((on) => !on)}
            disabled={disabled}
            aria-pressed={nativeInput}
            title={
              nativeInput
                ? `${helper.schemeName} input on -- typed words convert to native script`
                : `${helper.schemeName} input off -- typing plain Latin text`
            }
          >
            {nativeInput ? helper.scriptLabel : "ab"}
          </button>
        )}
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          dir="auto"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Chat message"
        />
        <button
          type="button"
          className={styles.sendButton}
          onClick={send}
          disabled={disabled || !convertAll(value).trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
