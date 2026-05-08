import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Briefcase, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  Trophy,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileUpload } from './components/FileUpload';
import { ChatAssistant } from './components/ChatAssistant';
import { InputContent, ScreeningResult } from './lib/types';
import { cn } from './lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [jobDescription, setJobDescription] = useState<InputContent>({ text: "" });
  const [cvs, setCvs] = useState<InputContent[]>([{ text: "" }]);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [isScreening, setIsScreening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCv = () => {
    if (cvs.length < 5) {
      setCvs([...cvs, { text: "" }]);
    }
  };

  const removeCv = (index: number) => {
    const newCvs = cvs.filter((_, i) => i !== index);
    setCvs(newCvs.length ? newCvs : [{ text: "" }]);
  };

  const updateCv = (index: number, content: InputContent) => {
    const newCvs = [...cvs];
    newCvs[index] = content;
    setCvs(newCvs);
  };

  const runScreening = async () => {
    setIsScreening(true);
    setError(null);
    try {
      const screeningResults: ScreeningResult[] = [];

      for (let i = 0; i < cvs.length; i++) {
        const cv = cvs[i];
        if (!cv.text && !cv.file) continue;

        const parts: any[] = [
          { text: "Job Description Content: " + jobDescription.text },
        ];

        if (jobDescription.file) {
          parts.push({
            inlineData: {
              data: jobDescription.file.data,
              mimeType: jobDescription.file.mimeType
            }
          });
        }

        parts.push({ text: `Target CV (Index ${i}): ` + cv.text });
        if (cv.file) {
          parts.push({
            inlineData: {
              data: cv.file.data,
              mimeType: cv.file.mimeType
            }
          });
        }

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            role: "user",
            parts: [
              ...parts,
              {
                text: `Scan this CV against the Job Description. Be extremely accurate and professional. 
                Return a JSON object with: 
                - score: 0-100 (match percentage)
                - strengths: list of key matching skills/keywords (label these as "Pros")
                - weaknesses: list of gaps or missing requirements (label these as "Cons")
                - summary: very brief overall decision summary
                - matchPercentage: same as score.
                
                Make sure the "strengths" (Pros) and "weaknesses" (Cons) are highly detailed and relevant to the job requirements.`
              }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                summary: { type: Type.STRING },
                matchPercentage: { type: Type.NUMBER }
              },
              required: ["score", "strengths", "weaknesses", "summary", "matchPercentage"]
            }
          }
        });

        if (response.text) {
          const data = JSON.parse(response.text);
          screeningResults.push({ ...data, cvIndex: i });
        }
      }

      setResults(screeningResults);
    } catch (err) {
      console.error(err);
      setError("Failed to screen CVs. Please try again.");
    } finally {
      setIsScreening(false);
    }
  };

  const resetSession = () => {
    setJobDescription({ text: "" });
    setCvs([{ text: "" }]);
    setResults([]);
    setError(null);
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";
    if (score >= 50) return "text-amber-400 border-amber-500/30 bg-amber-500/5";
    return "text-rose-400 border-rose-500/30 bg-rose-500/5";
  };

  const topMatch = results.length > 0 ? [...results].sort((a, b) => b.score - a.score)[0] : null;

  return (
    <div className="flex flex-col h-screen w-full bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
      {/* Header Section */}
      <header className="flex items-center justify-between px-10 py-5 border-b border-white/5 bg-[#1e293b]/40 backdrop-blur-xl shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase leading-none">
              ELABRAM <span className="text-blue-500 font-medium">TALENTSYNC</span> AI
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Professional Screening Intelligence</p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <button 
            onClick={resetSession}
            className="flex items-center gap-2 px-6 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-sm font-bold transition-all border border-transparent active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Matrix
          </button>
          
          <button 
            onClick={runScreening}
            disabled={isScreening || (!jobDescription.text && !jobDescription.file)}
            className={cn(
              "px-10 py-3 text-white text-sm font-black uppercase tracking-wider rounded-xl transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:grayscale",
              isScreening 
                ? "bg-slate-700 text-slate-500 cursor-not-allowed shadow-none" 
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
            )}
          >
            {isScreening ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-200" />
                Analyzing Deep Matrix...
              </div>
            ) : "Analyze All Candidates"}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Section: Job Description */}
        <section className="w-[480px] border-r border-white/5 flex flex-col p-10 gap-8 overflow-y-auto bg-black/10">
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Step 1</h2>
            <h3 className="text-2xl font-bold text-white tracking-tight">Requirement Context</h3>
            <p className="text-sm text-slate-400">Specify job requirements or upload the official JD.</p>
          </div>
          
          <FileUpload
            id="jd"
            label=""
            content={jobDescription}
            onChange={setJobDescription}
            placeholderText="Upload Job Description Document"
          />
        </section>

        {/* Right Section: Candidates Scan */}
        <section className="flex-1 flex flex-col overflow-hidden">
          <div className="px-10 py-8 flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Step 2</h2>
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-bold text-white tracking-tight">Evaluation Queue ({cvs.length}/5)</h3>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-8">
            <div className="grid grid-cols-1 gap-8">
              {cvs.map((cv, index) => {
                const result = results.find(r => r.cvIndex === index);
                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "bg-[#1e293b]/30 border rounded-[2.5rem] p-10 transition-all hover:bg-[#1e293b]/50 relative overflow-hidden group shadow-lg",
                      result ? `border-2 border-l-[12px] ${getScoreColorClass(result.score).split(' ').slice(1, 2).join(' ')}` : "border-white/5"
                    )}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                      <div className="lg:col-span-5 space-y-6">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-slate-400 border border-white/5">
                              0{index + 1}
                            </div>
                            <div className="overflow-hidden">
                              <h3 className="text-lg font-bold text-white truncate max-w-[200px] leading-tight">
                                {cv.file?.name || "Active Session"}
                              </h3>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Candidate Account</p>
                            </div>
                          </div>
                          {cvs.length > 1 && (
                            <button 
                              onClick={() => removeCv(index)}
                              className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all active:scale-90"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>

                        <FileUpload
                          id={`cv-${index}`}
                          label=""
                          content={cv}
                          onChange={(c) => updateCv(index, c)}
                          placeholderText="Attach Candidate Resume"
                        />
                      </div>

                      <div className="lg:col-span-7 flex flex-col pt-4">
                        {!result ? (
                          <div className="flex-1 border-2 border-dashed border-white/5 rounded-[2rem] bg-black/20 flex flex-col items-center justify-center text-slate-500 text-sm p-10 min-h-[240px]">
                            <Loader2 className={cn("w-10 h-10 mb-5 opacity-5", isScreening && "animate-spin opacity-40 text-blue-500")} />
                            <p className="font-bold uppercase tracking-widest text-[10px]">
                              {isScreening ? "Processing Analysis Data..." : "Awaiting Matrix Activation"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-8 p-8 bg-black/40 rounded-[2rem] border border-white/5 shrink-0 shadow-inner">
                              <div className={cn(
                                "w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 text-center shrink-0 shadow-2xl backdrop-blur-md font-mono",
                                getScoreColorClass(result.score).split(' ').slice(0, 2).join(' ')
                              )}>
                                <span className="text-3xl font-black italic tracking-tighter leading-none">{result.score}%</span>
                                <span className="text-[10px] font-bold uppercase opacity-60 mt-1 leading-none">Match</span>
                              </div>
                              <div className="space-y-2 overflow-hidden">
                                <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                  <Trophy className="w-4 h-4" />
                                  Intelligence Insight
                                </h4>
                                <p className="text-base font-medium text-slate-300 leading-relaxed italic">
                                  "{result.summary}"
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                              {/* PROS Section */}
                              <div className="p-6 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/10 space-y-4">
                                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <CheckCircle2 className="w-5 h-5" />
                                  PROS (Strengths)
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {result.strengths.map((s, i) => (
                                    <span key={i} className="px-3.5 py-2 bg-black/40 text-emerald-400 rounded-xl text-[13px] font-bold border border-emerald-500/20 shadow-sm leading-tight">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {/* CONS Section */}
                              <div className="p-6 bg-rose-500/5 rounded-[2rem] border border-rose-500/10 space-y-4">
                                <h4 className="text-xs font-black text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <AlertCircle className="w-5 h-5" />
                                  CONS (Gaps Found)
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {result.weaknesses.map((w, i) => (
                                    <span key={i} className="px-3.5 py-2 bg-black/40 text-rose-400 rounded-xl text-[13px] font-bold border border-rose-500/20 shadow-sm leading-tight">
                                      {w}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {cvs.length < 5 && (
                <button
                  onClick={addCv}
                  className="w-full py-16 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01] hover:bg-white/[0.03] hover:border-blue-500/40 transition-all group flex flex-col items-center justify-center gap-5 active:scale-[0.99] shadow-inner"
                >
                  <div className="w-20 h-20 bg-black/20 group-hover:bg-blue-500/10 rounded-[2rem] flex items-center justify-center transition-all border border-white/5 group-hover:border-blue-500/20 shadow-lg">
                    <Users className="w-10 h-10 text-slate-500 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-black text-slate-500 group-hover:text-blue-400 uppercase tracking-widest transition-colors leading-none">Initialize Candidate #{cvs.length + 1}</p>
                    <p className="text-xs text-slate-600 group-hover:text-slate-500 font-bold uppercase tracking-widest">Expansion Protocol Active (Limit 05)</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-10 py-5 bg-black/40 border-t border-white/5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-12">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] leading-none">
            © 2024 ELABRAM TALENTSYNC • SECURE ENCRYPTED ENVIRONMENT
          </p>
          {topMatch && (
            <div className="flex items-center gap-3 py-2 px-5 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-pulse shadow-lg shadow-emerald-900/10">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <p className="text-[11px] font-black text-emerald-300 uppercase tracking-widest">Priority Candidate Identified: {topMatch.score}% Alignment</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-8 text-[11px] font-black text-slate-500 uppercase tracking-widest">
           <div className="flex items-center gap-3 text-slate-600">
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-emerald-500/50 rounded-full"></span>
               AI Core Ready
             </div>
             <div className="w-[1px] h-3 bg-white/5"></div>
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-blue-500/50 rounded-full"></span>
               High Precision Mode
             </div>
           </div>
           <button className="hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-2">
             System Log
             <ArrowRight className="w-3 h-3" />
           </button>
        </div>
      </footer>

      <ChatAssistant 
        jobDescription={jobDescription} 
        results={results} 
        cvs={cvs} 
      />
    </div>
  );
}
