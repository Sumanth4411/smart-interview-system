import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, RefreshCw, Home, TrendingUp, Award, MessageCircle, Brain } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import type { InterviewSession } from "@/lib/storage";

export default function Result() {
  const nav = useNavigate();
  const [s, setS] = useState<InterviewSession | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("voxprep:result");
    if (!raw) { nav("/"); return; }
    setS(JSON.parse(raw));
  }, [nav]);

  if (!s) return null;

  const data = [
    { metric: "Technical", value: s.scores.technical },
    { metric: "Clarity", value: s.scores.communication },
    { metric: "Confidence", value: s.scores.confidence },
    { metric: "Overall", value: s.scores.overall },
  ];

  const download = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `interview-${s.domain.replace(/\s+/g, "-")}-${new Date(s.date).toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/15 border border-success/30 mb-4">
            <Award className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">Interview complete</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Your <span className="text-gradient">Performance</span></h1>
          <p className="text-muted-foreground">{s.domain} · {new Date(s.date).toLocaleString()}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="glass rounded-3xl p-6 shadow-soft">
            <div className="grid grid-cols-2 gap-4">
              <ScoreCard icon={Brain} label="Technical" value={s.scores.technical} color="text-primary" />
              <ScoreCard icon={MessageCircle} label="Clarity" value={s.scores.communication} color="text-accent" />
              <ScoreCard icon={TrendingUp} label="Confidence" value={s.scores.confidence} color="text-warning" />
              <ScoreCard icon={Award} label="Overall" value={s.scores.overall} color="text-success" />
            </div>
          </div>
          <div className="glass rounded-3xl p-6 shadow-soft min-h-[280px]">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={data}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {s.summary && (
          <div className="glass rounded-3xl p-6 md:p-8 mb-8 shadow-soft">
            <h2 className="text-2xl font-bold mb-3">Summary</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">{s.summary.summary}</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-success">Strengths</h3>
                <ul className="space-y-1.5 text-sm">
                  {s.summary.strengths.map((x, i) => <li key={i} className="flex gap-2"><span className="text-success">✓</span>{x}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-warning">Improvements</h3>
                <ul className="space-y-1.5 text-sm">
                  {s.summary.improvements.map((x, i) => <li key={i} className="flex gap-2"><span className="text-warning">→</span>{x}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <h2 className="text-2xl font-bold">Question breakdown</h2>
          {s.qa.map((q, i) => (
            <details key={i} className="glass rounded-2xl p-5 shadow-soft">
              <summary className="cursor-pointer font-semibold flex items-start justify-between gap-4">
                <span>Q{i + 1}. {q.question}</span>
                {q.evaluation && <span className="text-sm text-primary shrink-0">{q.evaluation.correctness}/100</span>}
              </summary>
              <div className="mt-4 space-y-3 text-sm">
                <div><span className="text-muted-foreground">Your answer: </span>{q.answer || <em>(no answer)</em>}</div>
                {q.evaluation && (
                  <>
                    <div><span className="text-muted-foreground">Feedback: </span>{q.evaluation.feedback}</div>
                    {q.evaluation.missingConcepts.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Missing concepts: </span>
                        {q.evaluation.missingConcepts.map((m, j) => (
                          <span key={j} className="inline-block px-2 py-0.5 mr-1 rounded-full bg-warning/15 text-warning text-xs">{m}</span>
                        ))}
                      </div>
                    )}
                    <div className="rounded-xl bg-secondary/50 p-3">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Suggested answer</div>
                      <div>{q.evaluation.improvedAnswer}</div>
                    </div>
                  </>
                )}
              </div>
            </details>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => nav("/")} className="bg-gradient-primary text-primary-foreground rounded-full px-6 gap-2"><RefreshCw className="w-4 h-4" /> Restart Interview</Button>
          <Button variant="outline" onClick={download} className="rounded-full px-6 gap-2"><Download className="w-4 h-4" /> Download Report</Button>
          <Button variant="ghost" onClick={() => nav("/history")} className="rounded-full px-6 gap-2"><Home className="w-4 h-4" /> View History</Button>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="rounded-2xl bg-card/60 p-4 border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-3xl font-bold mb-2">{value}<span className="text-sm text-muted-foreground font-normal">/100</span></div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}
