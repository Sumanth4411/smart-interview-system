import { Upload, FileText, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  resumeText: string;
  setResumeText: (v: string) => void;
  jobDescription: string;
  setJobDescription: (v: string) => void;
};

export default function UploadSection({ resumeText, setResumeText, jobDescription, setJobDescription }: Props) {
  const resumeRef = useRef<HTMLInputElement>(null);
  const jdRef = useRef<HTMLInputElement>(null);
  const [resumeName, setResumeName] = useState<string>("");
  const [jdName, setJdName] = useState<string>("");

  const readFile = async (f: File): Promise<string> => {
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
      // basic: just store name; AI can still infer from JD/domain
      return `[PDF resume uploaded: ${f.name}]`;
    }
    return await f.text();
  };

  const onResume = async (f: File) => {
    setResumeName(f.name);
    setResumeText(await readFile(f));
  };
  const onJd = async (f: File) => {
    setJdName(f.name);
    setJobDescription(await readFile(f));
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="glass rounded-3xl p-6 shadow-soft">
        <h3 className="font-semibold text-lg mb-2">Resume</h3>
        <p className="text-sm text-muted-foreground mb-4">Upload or paste your resume to get tailored questions.</p>
        <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" hidden onChange={(e) => e.target.files?.[0] && onResume(e.target.files[0])} />
        <Button variant="outline" onClick={() => resumeRef.current?.click()} className="gap-2 w-full mb-3">
          <Upload className="w-4 h-4" /> Upload PDF / DOC
        </Button>
        {resumeName && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-secondary mb-3 text-sm">
            <div className="flex items-center gap-2 truncate"><FileText className="w-4 h-4 text-primary" /> <span className="truncate">{resumeName}</span></div>
            <button onClick={() => { setResumeName(""); setResumeText(""); }} aria-label="Remove"><X className="w-4 h-4" /></button>
          </div>
        )}
        <Textarea placeholder="Or paste your resume here..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} className="min-h-[140px] resize-none" />
      </div>

      <div className="glass rounded-3xl p-6 shadow-soft">
        <h3 className="font-semibold text-lg mb-2">Job Description</h3>
        <p className="text-sm text-muted-foreground mb-4">Paste a JD to focus questions on required skills.</p>
        <input ref={jdRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" hidden onChange={(e) => e.target.files?.[0] && onJd(e.target.files[0])} />
        <Button variant="outline" onClick={() => jdRef.current?.click()} className="gap-2 w-full mb-3">
          <Upload className="w-4 h-4" /> Upload Job Description
        </Button>
        {jdName && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-secondary mb-3 text-sm">
            <div className="flex items-center gap-2 truncate"><FileText className="w-4 h-4 text-accent" /> <span className="truncate">{jdName}</span></div>
            <button onClick={() => { setJdName(""); setJobDescription(""); }} aria-label="Remove"><X className="w-4 h-4" /></button>
          </div>
        )}
        <Textarea placeholder="Paste the job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="min-h-[140px] resize-none" />
      </div>
    </div>
  );
}
