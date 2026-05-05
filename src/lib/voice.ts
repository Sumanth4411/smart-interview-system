// Browser SpeechRecognition + SpeechSynthesis helpers

export function speak(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  u.pitch = 1;
  u.onend = () => onEnd?.();
  const voices = window.speechSynthesis.getVoices();
  const pref =
    voices.find((v) => /en-(US|GB)/i.test(v.lang) && /female|samantha|google/i.test(v.name)) ||
    voices.find((v) => /en/i.test(v.lang));
  if (pref) u.voice = pref;
  window.speechSynthesis.speak(u);
}

export function pauseSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.pause();
}
export function resumeSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.resume();
}
export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

type RecognitionLike = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

export function createRecognition(): RecognitionLike | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-US";
  return r;
}

export type MicPermission = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

export async function getMicPermission(): Promise<MicPermission> {
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    // @ts-ignore
    const status = await navigator.permissions?.query({ name: "microphone" as PermissionName });
    if (status) return status.state as MicPermission;
  } catch {}
  return "unknown";
}

export class VolumeMeter {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private ownsStream = false;
  private raf: number | null = null;
  private data: Uint8Array | null = null;

  async start(onLevel: (level: number) => void, stream?: MediaStream) {
    this.ownsStream = !stream;
    this.stream = stream || await navigator.mediaDevices.getUserMedia({ audio: true });
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new Ctx();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    src.connect(this.analyser);
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    const tick = () => {
      if (!this.analyser || !this.data) return;
      this.analyser.getByteTimeDomainData(this.data as unknown as Uint8Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 0; i < this.data.length; i++) {
        const v = (this.data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this.data.length);
      onLevel(Math.min(1, rms * 2.5));
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (this.ownsStream) this.stream?.getTracks().forEach((t) => t.stop());
    this.ownsStream = false;
    this.stream = null;
    this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
  }
}
