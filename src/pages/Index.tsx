import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Code2, Layout, Server, BarChart3, Brain, FileCode, Coffee, Sparkles, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import UploadSection from "@/components/UploadSection";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DOMAINS = [
  { id: "Web Development", icon: Code2, color: "from-violet-500 to-fuchsia-500" },
  { id: "Frontend Development", icon: Layout, color: "from-pink-500 to-rose-500" },
  { id: "Backend Development", icon: Server, color: "from-emerald-500 to-teal-500" },
  { id: "Data Science", icon: BarChart3, color: "from-blue-500 to-cyan-500" },
  { id: "AI / ML", icon: Brain, color: "from-purple-500 to-indigo-500" },
  { id: "Python Developer", icon: FileCode, color: "from-amber-500 to-orange-500" },
  { id: "Java Developer", icon: Coffee, color: "from-red-500 to-pink-500" },
];

export default function Index() {
  const nav = useNavigate();
  const [domain, setDomain] = useState<string>("Web Development");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const startInterview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { domain, resumeText, jobDescription, count: 6 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const payload = {
        domain,
        questions: (data as any).questions as string[],
        insights: data,
      };
      sessionStorage.setItem("voxprep:interview", JSON.stringify(payload));
      nav("/interview");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate questions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-gradient-hero">
        <div className="container py-20 md:py-28 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Voice-first AI interviewer</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            AI Voice Interview <br />
            <span className="text-gradient">Simulator</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Practice real interviews with an AI that listens, asks, and gives instant feedback. No login. Just speak.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" onClick={() => document.getElementById("setup")?.scrollIntoView({ behavior: "smooth" })} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-full px-8 h-12">
              Start Interview <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => nav("/history")} className="rounded-full px-8 h-12">
              View History
            </Button>
          </div>
        </div>
      </section>

      {/* Setup */}
      <section id="setup" className="container py-16 md:py-20 space-y-12">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Choose your <span className="text-gradient">domain</span></h2>
          <p className="text-muted-foreground mb-6">Pick what you want to be interviewed on.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DOMAINS.map((d) => {
              const Icon = d.icon;
              const active = domain === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setDomain(d.id)}
                  className={`group relative text-left p-5 rounded-2xl border transition-all duration-300 ${active ? "border-primary shadow-glow scale-[1.02] bg-card" : "border-border hover:border-primary/50 bg-card/50 hover:scale-[1.02]"}`}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${d.color} flex items-center justify-center mb-3 shadow-soft`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-semibold text-sm">{d.id}</div>
                  {active && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Tailor your <span className="text-gradient">questions</span></h2>
          <p className="text-muted-foreground mb-6">Optional: add your resume and the job you're targeting.</p>
          <UploadSection
            resumeText={resumeText}
            setResumeText={setResumeText}
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
          />
        </div>

        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={startInterview} disabled={loading} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-full px-10 h-14 text-base">
            {loading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Preparing your interview...</>) : (<>Start AI Interview <ArrowRight className="w-5 h-5 ml-1" /></>)}
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        Built with voice AI · Practice freely · No account required
      </footer>
    </div>
  );
}
