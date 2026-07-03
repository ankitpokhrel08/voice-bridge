import { LANGUAGES } from "../../types/call";
import styles from "./LanguagePicker.module.css";

interface LanguagePickerProps {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  /** Prepends an "Auto-detect" option (value "auto") -- used for the
   * spoken-language picker, where whisper can detect the language itself. */
  includeAuto?: boolean;
}

export function LanguagePicker({ id = "preferred-language", value, onChange, includeAuto = false }: LanguagePickerProps) {
  return (
    <select
      id={id}
      className={styles.select}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {includeAuto && <option value="auto">Auto-detect</option>}
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
