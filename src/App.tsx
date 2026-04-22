/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Star, ChevronRight, Loader2, Image as ImageIcon, History, Award, BookOpen, Quote, Info, RefreshCw } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

// Initialization of Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface CalligraphyResult {
  scores: {
    brushwork: number;    // 笔法
    structure: number;    // 结构
    layout: number;       // 章法
    spirit: number;       // 神采
    [key: string]: number; // Allow dynamic access
  };
  totalScore: number;
  critique: {
    pros: string[];
    cons: string[];
    suggestions: string[];
  };
  authorStyle?: string;     // 风格推断 (如：颜体、柳体等)
  period?: string;          // 时代气息
}

const DIMENSIONS = [
  { id: 'brushwork', name: '笔法', description: '线条的质感、起承转合、力度与速度。', icon: <Award className="w-4 h-4" /> },
  { id: 'structure', name: '结构', description: '单字的间架布局、重心稳度、疏密合度。', icon: <Star className="w-4 h-4" /> },
  { id: 'layout', name: '章法', description: '整体行气、落款位置、虚实关系。', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'spirit', name: '神采', description: '作品的意境、墨色韵味、作者性情的表达。', icon: <Quote className="w-4 h-4" /> },
];

interface ScoreRingProps {
  score: number;
  label: string;
  active: boolean;
}

const ScoreRing: React.FC<ScoreRingProps> = ({ score, label, active }) => (
  <div className="flex flex-col items-center">
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="4"
          className="text-gray-100"
        />
        <motion.circle
          cx="48"
          cy="48"
          r="40"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={251.2}
          initial={{ strokeDashoffset: 251.2 }}
          animate={{ strokeDashoffset: 251.2 - (251.2 * score) / 100 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-vermilion"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-serif font-bold text-ink">{score}</span>
      </div>
    </div>
    <span className={`mt-3 text-sm transition-colors ${active ? 'text-vermilion font-bold' : 'text-gray-500'}`}>{label}</span>
  </div>
);

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CalligraphyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeCalligraphy = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      const prompt = `你是一位精通中国书法史、理论与技法的专家。请针对这张书法作品，从笔法、结构、章法、神采四个维度进行深度解析，并给出一个0-100分的评分。
      
      评价要求：
      1. 笔法：分析线条的入纸感、圆润度、虚实变化。
      2. 结构：分析撇捺的伸展、重心的安排。
      3. 章法：分析行间的呼应、虚实的空白处理。
      4. 神采：分析作品呈现的意境（如清逸、苍劲、沉厚等）。
      
      请以JSON格式返回，包含以下字段：
      - scores: { brushwork: number, structure: number, layout: number, spirit: number }
      - totalScore: number
      - critique: { pros: string[], cons: string[], suggestions: string[] }
      - authorStyle: string (可选，如推断其临摹的字体风格)
      - period: string (可选，评价其中的古意或现代感)`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scores: {
                type: Type.OBJECT,
                properties: {
                  brushwork: { type: Type.NUMBER },
                  structure: { type: Type.NUMBER },
                  layout: { type: Type.NUMBER },
                  spirit: { type: Type.NUMBER }
                },
                required: ['brushwork', 'structure', 'layout', 'spirit']
              },
              totalScore: { type: Type.NUMBER },
              critique: {
                type: Type.OBJECT,
                properties: {
                  pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['pros', 'cons', 'suggestions']
              },
              authorStyle: { type: Type.STRING },
              period: { type: Type.STRING }
            },
            required: ['scores', 'totalScore', 'critique']
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("分析书法作品时遇到错误，请重试。可能是模型限制或图片过大。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen paper-texture flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 py-8 border-b border-gray-200 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 seal-gradient rounded-sm flex items-center justify-center shadow-lg transform rotate-2">
              <span className="text-white text-xl font-serif font-bold">墨</span>
            </div>
            <div>
              <h1 className="text-2xl font-serif tracking-tight font-bold">墨韵评分</h1>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 opacity-60">AI Calligraphy Analysis</p>
            </div>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium">
            <a href="#" className="hover:text-vermilion transition-colors">艺廊</a>
            <a href="#" className="hover:text-vermilion transition-colors">理论</a>
            <a href="#" className="text-vermilion border-b border-vermilion pb-1">AI 测评</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col gap-16">
        {/* Hero Section */}
        {!image && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row gap-12 items-center text-center md:text-left"
          >
            <div className="flex-1 flex flex-col gap-6">
              <h2 className="text-5xl md:text-7xl font-serif leading-tight">文房四宝，<br /><span className="text-vermilion italic">以此为界。</span></h2>
              <p className="text-gray-600 max-w-md leading-relaxed text-lg">
                上传您的书法作品，无论是草书、行书还是楷书。墨韵 AI 将结合历代名家法帖，为您提供专业的笔法、结构与整体章法的进阶点评。
              </p>
              <div className="flex gap-4 justify-center md:justify-start">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-4 bg-ink text-white rounded-full hover:bg-vermilion transition-all duration-300 flex items-center gap-2 group shadow-xl hover:shadow-vermilion/20"
                >
                  <Upload className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                  <span>开始测评</span>
                </button>
                <button className="px-8 py-4 border border-ink/10 rounded-full hover:bg-ink/5 transition-all text-gray-700">
                  查看范本
                </button>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="w-full aspect-square bg-[#e8e4db] rounded-2xl rotate-2 shadow-2xl flex items-center justify-center p-8 border border-white/40">
                <div className="w-full h-full border border-ink/10 flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-10 paper-texture pointer-events-none"></div>
                  <ImageIcon className="w-24 h-24 text-ink/20 group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute bottom-8 right-8 w-16 h-16 seal-gradient opacity-20 transform -rotate-12"></div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-vermilion/5 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-ink/5 rounded-full blur-[80px]"></div>
            </div>
          </motion.section>
        )}

        {/* Upload & Loading State */}
        {image && !result && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-10"
          >
            <div className="relative group">
              <div className="absolute -inset-4 bg-white/40 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <img 
                src={image} 
                alt="Uploaded Calligraphy" 
                className="max-h-[60vh] rounded-lg shadow-2xl border-4 border-white relative z-10"
              />
            </div>
            
            <div className="flex flex-col items-center gap-6">
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-100 rounded-full shadow-lg">
                    <Loader2 className="w-5 h-5 text-vermilion animate-spin" />
                    <span className="text-sm font-medium">墨韵 AI 正在研墨析图...</span>
                  </div>
                  <p className="text-xs text-center text-gray-500 max-w-sm animate-pulse">
                    我们正在分析您的笔锋、结构与力道，请稍候。
                  </p>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button 
                    onClick={analyzeCalligraphy}
                    className="px-10 py-5 bg-vermilion text-white rounded-full hover:shadow-2xl hover:shadow-vermilion/30 transition-all flex items-center gap-2 group text-lg"
                  >
                    <span>确认测评</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => setImage(null)}
                    className="px-10 py-5 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>重选照片</span>
                  </button>
                </div>
              )}
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
          </motion.div>
        )}

        {/* Results Section */}
        {result && (
          <div className="flex flex-col gap-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-12"
            >
              <div className="md:col-span-5 flex flex-col gap-6">
                <div className="relative group cursor-zoom-in">
                  <img src={image!} alt="Work" className="w-full rounded-xl shadow-xl border-4 border-white" />
                  <div className="absolute top-4 right-4 w-12 h-12 seal-gradient flex items-center justify-center shadow-lg">
                    <span className="text-white font-serif font-bold text-xs">鉴<br/>赏</span>
                  </div>
                </div>
                {result.authorStyle && (
                  <div className="p-4 bg-white/40 border border-white/60 rounded-xl">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2 uppercase tracking-widest">
                      <History className="w-3 h-3" />
                      风格推测
                    </div>
                    <p className="font-serif text-lg">{result.authorStyle}</p>
                  </div>
                )}
              </div>

              <div className="md:col-span-7 flex flex-col gap-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
                  <div>
                    <h3 className="text-4xl font-serif mb-2">综合评定</h3>
                    <p className="text-gray-500 text-sm">测评时间： {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div className="text-7xl font-serif text-vermilion">
                    <span className="text-sm text-gray-400 uppercase tracking-tighter mr-2">Score</span>
                    {result.totalScore}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {DIMENSIONS.map((dim) => (
                    <ScoreRing 
                      key={dim.id} 
                      label={dim.name} 
                      score={result.scores[dim.id as keyof typeof result.scores]} 
                      active={true}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-bold uppercase tracking-widest">亮点分析</span>
                    </div>
                    <ul className="space-y-3">
                      {result.critique.pros.map((pro, i) => (
                        <li key={i} className="text-gray-600 text-sm leading-relaxed flex gap-2">
                          <span className="text-green-500">•</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-vermilion">
                      <div className="w-2 h-2 rounded-full bg-vermilion"></div>
                      <span className="text-sm font-bold uppercase tracking-widest">待臻之处</span>
                    </div>
                    <ul className="space-y-3">
                      {result.critique.cons.map((con, i) => (
                        <li key={i} className="text-gray-600 text-sm leading-relaxed flex gap-2">
                          <span className="text-vermilion">•</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-ink text-white p-12 rounded-[2rem] flex flex-col md:flex-row gap-12 items-center"
            >
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-2 opacity-50 text-xs font-bold uppercase tracking-[0.2em]">
                  <Info className="w-3 h-3" />
                  进阶建议
                </div>
                <h3 className="text-3xl font-serif">执笔建议与研习路径</h3>
                <div className="flex flex-col gap-3 mt-4">
                  {result.critique.suggestions.map((sug, i) => (
                    <div key={i} className="flex gap-3 text-gray-300 leading-relaxed text-sm border-l border-white/10 pl-6 py-2">
                      <span className="text-vermilion font-serif">0{i+1}</span>
                      {sug}
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => {
                  setImage(null);
                  setResult(null);
                }}
                className="px-10 py-5 ring-1 ring-white/20 hover:bg-white/10 rounded-full transition-all flex items-center gap-3 group"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                <span>再次测评</span>
              </button>
            </motion.div>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-gray-200 mt-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-50">
            <div className="w-8 h-8 seal-gradient rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-serif font-bold">墨</span>
            </div>
            <span className="font-serif text-lg italic">墨韵评分</span>
          </div>
          <p className="text-xs text-gray-400 font-mono">© 2026 INK RHYTHM . Power by Gemini Vision AI</p>
          <div className="flex gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-vermilion">服务协议</a>
            <a href="#" className="hover:text-vermilion">美学准则</a>
            <a href="#" className="hover:text-vermilion">隐私政策</a>
          </div>
        </div>
      </footer>

      {/* Invisible file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept="image/*"
      />
    </div>
  );
}
