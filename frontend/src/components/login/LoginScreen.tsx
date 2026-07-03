import { useState, type FormEvent } from "react";
import { LanguagePicker } from "./LanguagePicker";
import { LANGUAGES } from "../../types/call";
import styles from "./LoginScreen.module.css";

interface LoginScreenProps {
  onLogin: (username: string, preferredLanguage: string, spokenLanguage: string) => void;
}

const SIGNAL_BAR_COUNT = 48;

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState(detectDefaultLanguage);
  const [spokenLanguage, setSpokenLanguage] = useState("auto");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onLogin(trimmed, language, spokenLanguage);
  };

  return (
    <div className={styles.stage}>
      <header className={styles.header}>
        <span className={styles.signalDot} aria-hidden="true" />
        <span className={styles.wordmark}>Voice Bridge</span>
      </header>

      <main className={styles.hero}>
        <h1 className={styles.headline}>
          Say it once.
          <br />
          Hear it in your language.
        </h1>
        <p className={styles.subhead}>
          Live, translated captions for every call — so the language you speak is never the one that
          matters.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>
              Your name
            </label>
            <input
              id="username"
              className={styles.input}
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="spoken-language" className={styles.label}>
                I speak
              </label>
              <LanguagePicker id="spoken-language" value={spokenLanguage} onChange={setSpokenLanguage} includeAuto />
            </div>
            <div className={styles.field}>
              <label htmlFor="preferred-language" className={styles.label}>
                Show captions in
              </label>
              <LanguagePicker value={language} onChange={setLanguage} />
            </div>
          </div>

          <button type="submit" className={styles.cta} disabled={!name.trim()}>
            Join the bridge
          </button>
        </form>
      </main>

      <div className={styles.signalStrip} aria-hidden="true">
        {Array.from({ length: SIGNAL_BAR_COUNT }).map((_, index) => (
          <span
            key={index}
            className={styles.signalBar}
            style={{ animationDelay: `${(index % 12) * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function detectDefaultLanguage(): string {
  const browserLang = (navigator.language || "en").slice(0, 2).toLowerCase();
  const supported = LANGUAGES.map((lang) => lang.code) as string[];
  return supported.includes(browserLang) ? browserLang : "en";
}
