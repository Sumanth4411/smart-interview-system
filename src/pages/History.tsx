import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ArrowRight, Inbox } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { getHistory, clearHistory, type InterviewSession } from "@/lib/storage";

export default function History() {
  const nav = useNavigate();
  const [items, setItems] = useState<InterviewSession[]>([]);

  useEffect(() => { setItems(getHistory()); }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Interview <span className="text-gradient">History</span></h1>
            <p className="text-muted-foreground mt-1">Stored locally on this device.</p>
          </div>
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => { clearHistory(); setItems([]); }} className="gap-2">
              <Trash2 className="w-4 h-4" /> Clear
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No interviews yet.</p>
            <Button onClick={() => nav("/")} className="bg-gradient-primary text-primary-foreground rounded-full">Start your first interview</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((s) => (
              <button
                key={s.id}
                onClick={() => { sessionStorage.setItem("voxprep:result", JSON.stringify(s)); nav("/result"); }}
                className="w-full text-left glass rounded-2xl p-5 hover:shadow-elegant transition-all hover:scale-[1.01] flex items-center justify-between gap-4"
              >
                <div>
                  <div className="font-semibold">{s.domain}</div>
                  <div className="text-sm text-muted-foreground">{new Date(s.date).toLocaleString()} · {s.qa.length} questions</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gradient">{s.scores.overall}</div>
                    <div className="text-xs text-muted-foreground">overall</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
