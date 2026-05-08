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
    if (score >= 80) return "text-emerald-600 border-emerald-100 bg-emerald-50";
    if (score >= 50) return "text-amber-600 border-amber-100 bg-amber-50";
    return "text-rose-600 border-rose-100 bg-rose-50";
  };

  const ScoreRing = ({ score }: { score: number }) => {
    const colorClass = score >= 80 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-rose-500";
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center w-24 h-24 shrink-0 transition-all duration-1000 ease-out">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-100"
          />
          <motion.circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
            className={colorClass}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-black text-slate-800 leading-none">{score}%</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Match</span>
        </div>
      </div>
    );
  };

  const topMatch = results.length > 0 ? [...results].sort((a, b) => b.score - a.score)[0] : null;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Header Section */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-white shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase leading-none">
              ELABRAM <span className="text-blue-600 font-medium">TALENTSYNC</span> AI
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Enterprise Talent Screening</p>
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
          <button 
            onClick={resetSession}
            className="flex items-center gap-2 px-5 py-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-all border border-transparent hover:border-slate-200 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Clear Session
          </button>
          
          <button 
            onClick={runScreening}
            disabled={isScreening || (!jobDescription.text && !jobDescription.file)}
            className={cn(
              "px-8 py-2.5 text-white text-sm font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:grayscale",
              isScreening 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
            )}
          >
            {isScreening ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
            ) : "Analyze All Candidates"}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Section: Job Description */}
        <section className="w-[320px] border-r border-slate-200 flex flex-col p-8 gap-8 overflow-y-auto bg-white">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded border border-blue-100">
                Phase 01
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Job Requirements</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Provide context by pasting the JD or uploading the official document.</p>
          </div>
          
          <FileUpload
            id="jd"
            label=""
            content={jobDescription}
            onChange={setJobDescription}
            placeholderText="Target Job Description"
          />
        </section>

        {/* Right Section: Candidates Scan */}
        <section className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="px-8 py-6 flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded border border-emerald-100">
                  Phase 02
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Candidate Evaluation ({cvs.length}/5)</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-8">
            <div className="grid grid-cols-1 gap-6">
              {cvs.map((cv, index) => {
                const result = results.find(r => r.cvIndex === index);
                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "bg-white border rounded-3xl p-8 transition-all hover:shadow-xl hover:shadow-slate-200/50 relative group border-slate-200",
                      result && `border-l-[6px] ${getScoreColorClass(result.score).split(' ').slice(1, 2).join(' ')}`
                    )}
                  >
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                      <div className="xl:col-span-5 space-y-6">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 border border-slate-100 text-sm">
                              {index + 1}
                            </div>
                            <div className="overflow-hidden">
                              <h3 className="text-base font-bold text-slate-800 truncate max-w-[220px] leading-tight">
                                {cv.file?.name || "New Candidate"}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Ready for screening</p>
                              </div>
                            </div>
                          </div>
                          {cvs.length > 1 && (
                            <button 
                              onClick={() => removeCv(index)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all active:scale-90"
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

                      <div className="xl:col-span-7 flex flex-col pt-2">
                        {!result ? (
                          <div className="flex-1 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-slate-400 text-sm p-10 min-h-[220px]">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                              <Loader2 className={cn("w-6 h-6 opacity-20", isScreening && "animate-spin opacity-60 text-blue-600")} />
                            </div>
                            <p className="font-bold uppercase tracking-widest text-[10px] text-slate-400">
                              {isScreening ? "Processing Analysis..." : "Awaiting Matrix Analysis"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-700">
                            <div className="flex items-center gap-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100 shrink-0">
                               <ScoreRing score={result.score} />
                              <div className="space-y-2 overflow-hidden">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <Trophy className="w-3.5 h-3.5" />
                                  Executive Summary
                                </h4>
                                <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                                  {result.summary}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                              {/* PROS Section */}
                              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Top Strengths
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {result.strengths.map((s, i) => (
                                    <span key={i} className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-1.5">
                                      <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {/* CONS Section */}
                              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                                <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4" />
                                  Skill Gaps Identified
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {result.weaknesses.map((w, i) => (
                                    <span key={i} className="px-2.5 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-100 flex items-center gap-1.5">
                                      <div className="w-1 h-1 bg-rose-400 rounded-full"></div>
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
                  className="w-full py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-white hover:bg-white hover:border-blue-400/50 transition-all group flex flex-col items-center justify-center gap-4 active:scale-[0.99] shadow-sm hover:shadow-md"
                >
                  <div className="w-12 h-12 bg-slate-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center transition-all border border-slate-100 group-hover:border-blue-100">
                    <Users className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-black text-slate-400 group-hover:text-slate-800 uppercase tracking-widest transition-colors leading-none">Add Candidate #0{cvs.length + 1}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Compare up to 5 candidates</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-8 py-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-8">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
            © 2024 ELABRAM TALENTSYNC • PROFESSIONAL RECRUITMENT SUITE
          </p>
          {topMatch && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 py-1.5 px-4 bg-emerald-50 border border-emerald-100 rounded-full shadow-sm"
            >
              <Trophy className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Priority Match: {cvs[topMatch.cvIndex]?.file?.name || `#${topMatch.cvIndex + 1}`}</p>
            </motion.div>
          )}
        </div>
        
        <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
           <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
               System Stable
             </div>
             <div className="w-[1px] h-3 bg-slate-200"></div>
             <div className="flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
               AI Engine Online
             </div>
           </div>
           <div className="flex items-center gap-2 text-slate-300">
             Security level: 
             <span className="text-slate-500">Enterprise</span>
           </div>
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
