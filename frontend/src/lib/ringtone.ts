/** Plays /assets/ringtone.mp3 on loop; falls back to a synthesized Web Audio
 * beep if the file fails to load. Imperative, no React involvement. */
export class Ringtone {
  private audio: HTMLAudioElement | null = null;
  private fallbackIntervalId: number | null = null;
  private fallbackAudioContext: AudioContext | null = null;
  private usingFallback = false;

  constructor() {
    const audio = new Audio("/assets/ringtone.mp3");
    audio.preload = "auto";
    audio.loop = true;
    audio.addEventListener("error", () => {
      this.usingFallback = true;
    });
    audio.load();
    this.audio = audio;
  }

  async play(): Promise<void> {
    if (this.usingFallback) {
      this.playFallbackBeep();
      return;
    }
    try {
      await this.audio?.play();
    } catch {
      this.usingFallback = true;
      this.playFallbackBeep();
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    if (this.fallbackIntervalId !== null) {
      window.clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = null;
    }
  }

  private playFallbackBeep(): void {
    if (this.fallbackIntervalId !== null) return;

    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.fallbackAudioContext) {
      this.fallbackAudioContext = new AudioContextCtor();
    }
    const ctx = this.fallbackAudioContext;

    const beep = () => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 800;
      gain.gain.value = 0.2;
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.3);
    };

    beep();
    this.fallbackIntervalId = window.setInterval(beep, 1000);
  }
}
