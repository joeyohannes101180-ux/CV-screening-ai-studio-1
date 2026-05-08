import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Minus, 
  Bot, 
  User, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { InputContent, ScreeningResult } from '../lib/types';
import { cn } from '../lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface ChatAssistantProps {
  jobDescription: InputContent;
  results: ScreeningResult[];
  cvs: InputContent[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatAssistant({ jobDescription, results, cvs }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Halo! Saya asisten AI Elabram TalentSync. Ada yang bisa saya bantu terkait hasil screening atau deskripsi pekerjaan hari ini?',
      timestamp: new Date()
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          role: "user",
          parts: [
            { text: `
              You are Elabram TalentSync Assistant. 
              Current Job Description: ${jobDescription.text}
              
              Screening Results:
              ${results.map((r, i) => `
                Candidate #${i+1} (${cvs[r.cvIndex]?.file?.name || 'Raw Text'}):
                Score: ${r.score}%
                Pros: ${r.strengths.join(', ')}
                Cons: ${r.weaknesses.join(', ')}
                Summary: ${r.summary}
              `).join('\n')}
              
              Use this context to answer user questions about recruitment. Be professional, concise, and helpful. You can respond in both English and Indonesian as appropriate.
            ` },
            ...messages.map(m => ({ text: `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}` })),
            { text: `User: ${input}` }
          ]
        }
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.text || 'I apologize, but I couldn\'t generate a response. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'System timeout. Please verify your connection and try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-10 right-10 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[400px] h-[600px] bg-white border border-slate-200 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-6 bg-slate-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm tracking-tight">AI Recruitment Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Intelligence Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/50 hover:text-white"
              >
                <Minus className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "flex gap-3",
                  m.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                    m.role === 'user' ? "bg-blue-600 text-white border-blue-500" : "bg-slate-100 text-slate-500 border-slate-200"
                  )}>
                    {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                    m.role === 'user' 
                      ? "bg-blue-50 text-blue-900 border border-blue-100 rounded-tr-none" 
                      : "bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200 animate-pulse">
                    <Bot className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 flex items-center gap-1">
                    <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-6 bg-slate-50 border-t border-slate-200">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about candidates or JD..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500/50 transition-all placeholder:text-slate-400 shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-2 p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">Enterprise AI Intelligence</p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-2xl relative group overflow-hidden",
          isOpen ? "bg-rose-500 rotate-90" : "bg-blue-600"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        {isOpen ? <X className="w-8 h-8 text-white relative z-10" /> : <MessageSquare className="w-8 h-8 text-white relative z-10" />}
        {!isOpen && (
           <div className="absolute top-4 right-4 w-2 h-2 bg-emerald-400 rounded-full shadow-sm"></div>
        )}
      </motion.button>
    </div>
  );
}
