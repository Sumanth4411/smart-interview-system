import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, SkipForward, Loader2, Volume2, Pause, Play, Square, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import VolumeBars from "@/components/VolumeBars";
import { speak, stopSpeaking, pauseSpeaking, resumeSpeaking, createRecognition, getMicPermission, VolumeMeter, type MicPermission } from "@/lib/voice";
import { supabase } from "@/integrations/supabase/client";
import { saveSession, type InterviewSession } from "@/lib/storage";
import { toast } from "sonner";

type QA = InterviewSession["qa"][number];

export default function Interview() {
  const nav = useNavigate();
  const [domain, setDomain] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [paused, setPaused] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [speakingNow, setSpeakingNow] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [qa, setQa] = useState<QA[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [micPerm, setMicPerm] = useState<MicPermission>("unknown");
  const [level, setLevel] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const recRef = useRef<ReturnType<typeof createRecognition>>(null);
  const meterRef = useRef<VolumeMeter | null>(null);
  const timerRef = useRef<number | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("voxprep:interview");
    if (!raw) { nav("/"); return; }
    const p = JSON.parse(raw);
    setDomain(p.domain);
    setQuestions(p.questions || []);
    getMicPermission().then(setMicPerm);
  }, [nav]);

  // Ask question via TTS when index changes
  useEffect(() => {
    if (!questions.length) return;
    setTranscript("");
    setInterim("");
    setSeconds(0);
    setTtsPaused(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    setSpeakingNow(true);
    speak(questions[idx], () => setSpeakingNow(false));
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      stopSpeaking();
      setSpeakingNow(false);
    };
  }, [idx, questions]);

  useEffect(() => () => { meterRef.current?.stop(); }, []);

  const startListening = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicPerm("unsupported");
        toast.error("Microphone not supported in this browser. Please type your answer.");
        return;
      }

      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
          setMicPerm(status.state as MicPermission);
          if (status.state === "denied") {
            toast.error("Microphone is blocked. Click the lock icon in the address bar and allow microphone access, then tap the mic again.");
            return;
          }
        } catch {}
      }

      // Request mic stream directly from the user's mic-button click.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicPerm("granted");
      stopSpeaking();
      setSpeakingNow(false);

      // Pick a supported mime type
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];
      let mime = "";
      for (const c of candidates) {
        // @ts-ignore
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) { mime = c; break; }
      }
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
        // stop tracks
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        if (blob.size < 500) return; // ignore empty
        await transcribeBlob(blob);
      };
      mr.start();

      // Live-preview transcript via Web Speech (best-effort, optional)
      const r = createRecognition();
      if (r) {
        recRef.current = r;
        let finalText = transcript;
        r.onresult = (e: any) => {
          let interimT = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalText += t + " ";
            else interimT += t;
          }
          setInterim(interimT);
          // don't overwrite transcript here — Whisper result is authoritative
          if (finalText.trim() && !transcript) setTranscript(finalText.trim());
        };
        r.onerror = () => {};
        r.onend = () => {};
        try { r.start(); } catch {}
      }

      setListening(true);
      setPaused(false);

      // Volume meter (reuse a fresh stream is fine; VolumeMeter opens its own)
      meterRef.current?.stop();
      const vm = new VolumeMeter();
      meterRef.current = vm;
      await vm.start(setLevel, stream);
    } catch (err: any) {
      const p = await getMicPermission();
      setMicPerm(p);
      if (err?.name === "NotAllowedError" || p === "denied") toast.error("Microphone is blocked. Click the lock icon in the address bar and allow microphone access, then tap the mic again.");
      else if (err?.name === "NotFoundError") toast.error("No microphone found on this device.");
      else if (err?.name === "NotReadableError") toast.error("Microphone is being used by another app. Close it and try again.");
      else toast.error(err?.message || "Could not start microphone");
    }
  };

  const pauseListening = () => {
    try { recRef.current?.stop(); } catch {}
    try {
      if (mediaRecRef.current && mediaRecRef.current.state === "recording") mediaRecRef.current.stop();
    } catch {}
    setListening(false);
    setPaused(true);
    meterRef.current?.stop();
  };

  const stopListening = () => {
    try { recRef.current?.abort(); } catch {}
    try {
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") mediaRecRef.current.stop();
    } catch {}
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setListening(false);
    setPaused(false);
    meterRef.current?.stop();
  };

  const transcribeBlob = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const buf = await blob.arrayBuffer();
      // base64 encode in chunks to avoid stack overflow
      const bytes = new Uint8Array(buf);
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(bin);
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio: base64, mimeType: blob.type },
      });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      const text = ((data as any).text || "").trim();
      if (text) {
        setTranscript((prev) => (prev ? prev + " " : "") + text);
        setInterim("");
      } else {
        toast.message("Didn't catch that — try again or type your answer.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  const toggleTts = () => {
    if (!speakingNow) { setSpeakingNow(true); setTtsPaused(false); speak(questions[idx], () => setSpeakingNow(false)); return; }
    if (ttsPaused) { resumeSpeaking(); setTtsPaused(false); }
    else { pauseSpeaking(); setTtsPaused(true); }
  };

  const submitAnswer = async () => {
    stopListening();
    setEvaluating(true);
    const answer = (transcript + " " + interim).trim();
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-answer", {
        body: { question: questions[idx], answer, domain },
      });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      const evaluation = data as QA["evaluation"];
      const newQa: QA = { question: questions[idx], answer, evaluation };
      const next = [...qa, newQa];
      setQa(next);

      // Speak the interviewer's feedback before moving on
      const isLast = idx + 1 >= questions.length;
      const spoken = `Thanks for your answer. ${evaluation?.feedback || ""} ${isLast ? "That was the final question. Let me prepare your final report." : "Here is the next question."}`;
      await new Promise<void>((resolve) => {
        setSpeakingNow(true);
        speak(spoken, () => { setSpeakingNow(false); resolve(); });
        // safety: resolve after 20s max
        setTimeout(() => resolve(), 20000);
      });

      if (isLast) await finalize(next);
      else setIdx(idx + 1);
    } catch (e: any) {
      toast.error(e.message || "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  const finalize = async (allQa: QA[]) => {
    const tech = avg(allQa.map((q) => q.evaluation?.correctness ?? 0));
    const comm = avg(allQa.map((q) => q.evaluation?.clarity ?? 0));
    const conf = avg(allQa.map((q) => q.evaluation?.confidence ?? 0));
    const overall = Math.round((tech + comm + conf) / 3);
    let summary;
    try {
      const { data } = await supabase.functions.invoke("final-report", { body: { domain, qa: allQa } });
      if (data && !(data as any).error) summary = data;
    } catch {}
    const session: InterviewSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      domain,
      scores: { technical: Math.round(tech), communication: Math.round(comm), confidence: Math.round(conf), overall },
      qa: allQa,
      summary,
    };
    saveSession(session);
    sessionStorage.setItem("voxprep:result", JSON.stringify(session));
    nav("/result");
  };

  if (!questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const progress = ((idx) / questions.length) * 100;
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  const permMeta: Record<MicPermission, { label: string; icon: any; cls: string }> = {
    granted: { label: "Mic ready", icon: ShieldCheck, cls: "text-success bg-success/10 border-success/30" },
    denied: { label: "Mic blocked", icon: ShieldAlert, cls: "text-destructive bg-destructive/10 border-destructive/30" },
    prompt: { label: "Mic — click to allow", icon: ShieldQuestion, cls: "text-warning bg-warning/10 border-warning/30" },
    unknown: { label: "Mic status unknown", icon: ShieldQuestion, cls: "text-muted-foreground bg-muted border-border" },
    unsupported: { label: "Mic unsupported", icon: ShieldAlert, cls: "text-destructive bg-destructive/10 border-destructive/30" },
  };
  const PermIcon = permMeta[micPerm].icon;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <div className="container py-8 md:py-12 max-w-4xl">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="text-sm text-muted-foreground">Question {idx + 1} of {questions.length} · {domain}</div>
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${permMeta[micPerm].cls}`}>
              <PermIcon className="w-3.5 h-3.5" /> {permMeta[micPerm].label}
            </div>
            <div className="font-mono text-sm tabular-nums px-3 py-1 rounded-full bg-secondary">{mins}:{secs}</div>
          </div>
        </div>
        <Progress value={progress} className="h-2 mb-8" />

        <div className="glass rounded-3xl p-8 md:p-10 mb-6 shadow-elegant animate-fade-in-up">
          <div className="flex items-start gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow ${speakingNow && !ttsPaused ? "animate-pulse-ring" : ""}`}>
              <Volume2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Interviewer</div>
              <h2 className="text-xl md:text-2xl font-semibold leading-snug">{questions[idx]}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={toggleTts} className="gap-1.5 rounded-full h-8">
              {speakingNow && !ttsPaused ? <><Pause className="w-3.5 h-3.5" /> Pause</> : ttsPaused ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Play className="w-3.5 h-3.5" /> Replay</>}
            </Button>
            {speakingNow && (
              <Button size="sm" variant="ghost" onClick={() => { stopSpeaking(); setSpeakingNow(false); setTtsPaused(false); }} className="gap-1.5 rounded-full h-8">
                <Square className="w-3.5 h-3.5" /> Stop
              </Button>
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-8 shadow-soft min-h-[180px] mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Your answer</div>
            <VolumeBars level={level} active={listening} />
          </div>
          {listening ? (
            <p className="text-base md:text-lg leading-relaxed min-h-[120px]">
              {transcript} <span className="text-muted-foreground italic">{interim}</span>
              {!transcript && !interim && (
                <span className="text-muted-foreground/60">Listening… start speaking.</span>
              )}
            </p>
          ) : (
            <textarea
              className="w-full bg-transparent outline-none resize-none text-base md:text-lg min-h-[120px] placeholder:text-muted-foreground/60"
              placeholder={transcribing ? "Transcribing your audio…" : "Press the mic and start speaking, or type here…"}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={listening ? pauseListening : startListening}
            disabled={micPerm === "unsupported"}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${listening ? "bg-destructive text-destructive-foreground animate-pulse-ring" : "bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105"}`}
            aria-label={listening ? "Pause recording" : paused ? "Resume recording" : "Start recording"}
          >
            {listening ? <Pause className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>
          {(listening || paused) && (
            <Button size="lg" variant="outline" onClick={stopListening} className="rounded-full px-5 h-12 gap-2">
              <Square className="w-4 h-4" /> Stop
            </Button>
          )}
          <Button size="lg" variant="outline" onClick={submitAnswer} disabled={evaluating || (!transcript && !interim)} className="rounded-full px-6 h-12 gap-2">
            {evaluating ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating…</> : <>Submit & Next <SkipForward className="w-4 h-4" /></>}
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-4">
          {micPerm === "denied" ? "Mic blocked — allow microphone from the browser lock icon, then tap the mic again" : listening ? "Listening — tap pause to keep your text, stop to finish recording" : paused ? "Paused — tap mic to resume" : "Tap the mic to start answering"}
        </div>
      </div>
    </div>
  );
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
