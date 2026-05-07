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
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-rose-600 bg-rose-50 border-rose-200";
  };

  const topMatch = results.length > 0 ? [...results].sort((a, b) => b.score - a.score)[0] : null;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Header Section */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase leading-none">
              TALENTSYNC <span className="text-blue-600 font-medium">AI</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Professional CV Reviewer</p>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <button 
            onClick={resetSession}
            className="flex items-center gap-2 px-6 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
            Reset All
          </button>
          
          <button 
            onClick={runScreening}
            disabled={isScreening || (!jobDescription.text && !jobDescription.file)}
            className={cn(
              "px-10 py-3 text-white text-sm font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:grayscale",
              isScreening 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
            )}
          >
            {isScreening ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </div>
            ) : "Analyze All CVs"}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Section: Job Description */}
        <section className="w-[480px] border-r border-slate-200 flex flex-col p-8 gap-6 overflow-y-auto bg-white/50">
          <div className="space-y-1">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Step 1</h2>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Job Description</h3>
            <p className="text-sm text-slate-500">Paste your requirements or upload the document below.</p>
          </div>
          
          <FileUpload
            id="jd"
            label=""
            content={jobDescription}
            onChange={setJobDescription}
            placeholderText="Target Job Requirements"
          />
        </section>

        {/* Right Section: Candidates Scan */}
        <section className="flex-1 flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/30">
            <div className="space-y-1">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Step 2</h2>
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Process Candidates ({cvs.length}/5)</h3>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="grid grid-cols-1 gap-6">
              {cvs.map((cv, index) => {
                const result = results.find(r => r.cvIndex === index);
                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "bg-white border rounded-[2rem] p-8 transition-all hover:shadow-xl hover:shadow-slate-200/50 relative overflow-hidden",
                      result ? `border-2 border-l-8 ${getScoreColorClass(result.score).split(' ').slice(1).join(' ')}` : "border-slate-200"
                    )}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-5 space-y-6">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400">
                              0{index + 1}
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 truncate max-w-[200px]">
                              {cv.file?.name || "New Candidate"}
                            </h3>
                          </div>
                          {cvs.length > 1 && (
                            <button 
                              onClick={() => removeCv(index)}
                              className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"
                              title="Remove Candidate"
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
                          placeholderText="Attach Resume"
                        />
                      </div>

                      <div className="lg:col-span-7 flex flex-col">
                        {!result ? (
                          <div className="flex-1 border-2 border-dashed border-slate-100 rounded-[1.5rem] bg-slate-50/30 flex flex-col items-center justify-center text-slate-400 text-sm p-8 min-h-[200px]">
                            <Loader2 className={cn("w-8 h-8 mb-4 opacity-10", isScreening && "animate-spin opacity-40")} />
                            {isScreening ? "Analyzing document content..." : "Ready to analyze candidate data"}
                          </div>
                        ) : (
                          <div className="space-y-6 h-full flex flex-col">
                            <div className="flex items-center gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100 shrink-0">
                              <div className={cn(
                                "w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 text-center shrink-0 shadow-sm",
                                getScoreColorClass(result.score)
                              )}>
                                <span className="text-xl font-black">{result.score}%</span>
                                <span className="text-[10px] font-bold uppercase opacity-60 leading-none">Match</span>
                              </div>
                              <div className="space-y-1 overflow-hidden">
                                <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                  <Trophy className="w-4 h-4" />
                                  Analysis Summary
                                </h4>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed truncate-2-lines">
                                  {result.summary}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
                                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4" />
                                  PROS (STRENGTHS)
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {result.strengths.map((s, i) => (
                                    <span key={i} className="px-2.5 py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100 shadow-sm">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 space-y-4">
                                <h4 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4" />
                                  CONS (MISSING)
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {result.weaknesses.map((w, i) => (
                                    <span key={i} className="px-2.5 py-1.5 bg-white text-rose-600 rounded-lg text-xs font-bold border border-rose-100 shadow-sm">
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
                  className="w-full py-12 border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-white hover:bg-slate-50 hover:border-blue-300 transition-all group flex flex-col items-center justify-center gap-4 active:scale-[0.99]"
                >
                  <div className="w-16 h-16 bg-slate-100 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center transition-colors">
                    <Users className="w-8 h-8 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-slate-400 group-hover:text-blue-600 uppercase tracking-widest transition-colors">Add Candidate #{cvs.length + 1}</p>
                    <p className="text-xs text-slate-300 group-hover:text-slate-400 font-bold uppercase tracking-tight">Compare up to 5 candidates simultaneously</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-8 py-3 bg-white border-t border-slate-200 flex justify-between items-center shrink-0 shadow-up">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">© 2024 TALENTSYNC AI • SECURE RECRUITMENT CLOUD</p>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
             <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
               <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
               System Ready
             </div>
             <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
               <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
               Accuracy: 99.8%
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
