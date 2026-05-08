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
  X,
  LayoutDashboard,
  Table as TableIcon,
  Plus,
  FileText,
  GripVertical
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

  const [activeTab, setActiveTab] = useState<'detailed' | 'bulk'>('detailed');
  
  // Bulk state
  const [bulkCvs, setBulkCvs] = useState<InputContent[]>(Array(5).fill({ text: "" }));
  const [bulkResults, setBulkResults] = useState<ScreeningResult[]>([]);
  const [isBulkScreening, setIsBulkScreening] = useState(false);

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
    if (activeTab === 'detailed') {
      setCvs([{ text: "" }]);
      setResults([]);
    } else {
      setBulkCvs(Array(5).fill({ text: "" }));
      setBulkResults([]);
    }
    setError(null);
  };

  const handleBulkAnalyze = async () => {
    if ((!jobDescription.text && !jobDescription.file) || bulkCvs.every(cv => !cv.text && !cv.file)) return;
    
    setIsBulkScreening(true);
    
    // Process only non-empty CVs
    const validIndices = bulkCvs
      .map((cv, i) => (cv.text || cv.file ? i : -1))
      .filter(i => i !== -1);

    try {
      // Run all screenings in parallel for speed
      const screeningPromises = validIndices.map(async (i) => {
        const cv = bulkCvs[i];
        const parts: any[] = [{ text: "Evaluate CV score against JD. Job Description: " + jobDescription.text }];
        
        if (jobDescription.file) {
          parts.push({ inlineData: { data: jobDescription.file.data, mimeType: jobDescription.file.mimeType } });
        }

        parts.push({ text: `Candidate CV: ` + cv.text });
        if (cv.file) {
          parts.push({ inlineData: { data: cv.file.data, mimeType: cv.file.mimeType } });
        }

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            role: "user",
            parts: [
              ...parts,
              { text: "Return ONLY a JSON object with: { \"score\": number }. Score is 0-100." }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER }
              },
              required: ["score"]
            }
          }
        });

        if (response.text) {
          const data = JSON.parse(response.text);
          return { 
            cvIndex: i, 
            score: data.score, 
            strengths: [], 
            weaknesses: [], 
            summary: "", 
            matchPercentage: data.score 
          };
        }
        return null;
      });

      const results = await Promise.all(screeningPromises);
      const filteredResults = results.filter((r): r is ScreeningResult => r !== null);
      setBulkResults(filteredResults);
    } catch (err) {
      console.error(err);
      setError("Failed to screen CVs. Please try again.");
    } finally {
      setIsBulkScreening(false);
    }
  };

  const addBulkRow = () => {
    if (bulkCvs.length < 25) {
      setBulkCvs([...bulkCvs, { text: "" }]);
    }
  };

  const updateBulkCv = (index: number, content: InputContent) => {
    const newCvs = [...bulkCvs];
    newCvs[index] = content;
    setBulkCvs(newCvs);
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
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('detailed')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'detailed' 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Deep Analysis
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'bulk' 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <TableIcon className="w-4 h-4" />
            Bulk Table
          </button>
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
            onClick={activeTab === 'detailed' ? runScreening : handleBulkAnalyze}
            disabled={isScreening || isBulkScreening || (!jobDescription.text && !jobDescription.file)}
            className={cn(
              "px-8 py-2.5 text-white text-sm font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:grayscale",
              (isScreening || isBulkScreening) 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
            )}
          >
            {(isScreening || isBulkScreening) ? (
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
          {activeTab === 'detailed' ? (
            <>
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
            </>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded border border-blue-100">
                      Bulk Selection
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">High-Volume Screening Table</h3>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Capacity: {bulkCvs.filter(cv => cv.text || cv.file).length} / 25 Candidates
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[60px] text-center">#</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Requirement</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-full">Candidate Data</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[120px] text-center">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkCvs.map((cv, index) => {
                        const result = bulkResults.find(r => r.cvIndex === index);
                        return (
                          <motion.tr 
                            key={index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="group hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-4 py-2 font-mono text-[10px] text-slate-400 text-center">
                              {index + 1}
                            </td>
                            <td className="px-4 py-2">
                              {index === 0 ? (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                  <Briefcase className="w-3 h-3 text-blue-600" />
                                  <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-blue-900 truncate">
                                      {jobDescription.file?.name || "Active JD"}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-[9px] text-slate-300 uppercase font-black tracking-widest pl-2">
                                  <GripVertical className="w-3 h-3 opacity-20" />
                                  Same
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <div className="relative group/input">
                                <FileUpload
                                  id={`bulk-cv-${index}`}
                                  label=""
                                  content={cv}
                                  onChange={(c) => updateBulkCv(index, c)}
                                  placeholderText="Upload Resume"
                                  isCompact
                                />
                                {bulkCvs.length > 5 && (
                                  <button
                                    onClick={() => {
                                      const newCvs = bulkCvs.filter((_, i) => i !== index);
                                      setBulkCvs(newCvs);
                                    }}
                                    className="absolute -right-2 -top-1 w-5 h-5 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 hover:border-rose-200 shadow-sm opacity-0 group-hover/input:opacity-100 transition-all z-10"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {result ? (
                                <div className={cn(
                                  "inline-flex flex-col items-center justify-center px-3 py-1 rounded-lg border-2 font-black",
                                  getScoreColorClass(result.score)
                                )}>
                                  <span className="text-sm leading-none">{result.score}%</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                                  <Loader2 className={cn("w-4 h-4", isBulkScreening && bulkCvs[index].text && "animate-spin text-blue-600")} />
                                  <span className="text-[8px] font-bold uppercase tracking-tighter">
                                    {isBulkScreening ? "Scanning" : "Wait"}
                                  </span>
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {bulkCvs.length < 25 && (
                    <button 
                      onClick={addBulkRow}
                      className="w-full p-2.5 hover:bg-slate-50 text-blue-600 flex items-center justify-center gap-2 border-t border-slate-100 transition-all font-bold text-[10px] uppercase tracking-widest"
                    >
                      <Plus className="w-3 h-3" />
                      Add Candidate (Max 25)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
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
