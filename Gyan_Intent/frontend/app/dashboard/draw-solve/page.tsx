"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowLeft, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

const AirCanvas = dynamic(() => import("@/components/draw/AirCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-[640px] aspect-[4/3] rounded-xl bg-white/5 animate-pulse flex items-center justify-center">
      <p className="text-white/40">Loading canvas...</p>
    </div>
  ),
});

interface Solution {
  image: string;
  answer: string;
  timestamp: number;
}

export default function DrawSolvePage() {
  const [isSolving, setIsSolving] = useState(false);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [error, setError] = useState("");

  const handleSolve = async (imageDataUrl: string) => {
    setIsSolving(true);
    setError("");
    try {
      const res = await fetch("/api/solve-drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to solve");
      setSolutions((prev) => [
        { image: imageDataUrl, answer: data.answer, timestamp: Date.now() },
        ...prev,
      ]);
    } catch (e: any) {
      console.error("Solve error:", e);
      setError(e.message || "Failed to solve the drawing");
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-white/60 hover:text-white transition">
              <ArrowLeft size={20} />
            </a>
            <h1 className="text-xl font-bold">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                Solver
              </span>
            </h1>
          </div>
          {solutions.length > 0 && (
            <button
              onClick={() => setSolutions([])}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition"
            >
              <Trash2 size={14} /> Clear History
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Camera + Drawing */}
          <div>
            <AirCanvas onSolve={handleSolve} isSolving={isSolving} />
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}
          </div>

          {/* Right: Solutions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles size={18} className="text-purple-400" />
              Solution
            </h2>

            {solutions.length === 0 && !isSolving && (
              <div className="glass-panel rounded-xl p-8 text-center">
                <p className="text-white/40 text-sm">
                  Sketch a problem and press &quot;Solve&quot; to get an AI-powered solution
                </p>
                <div className="mt-4 flex flex-col gap-2 text-left max-w-xs mx-auto text-xs text-white/30">
                  <p>&#x1F4DD; Draw a math equation (e.g. 2+3, x&sup2;+5x=0)</p>
                  <p>&#x1F4D0; Draw a geometric shape</p>
                  <p>&#x1F9EA; Draw a chemical formula</p>
                  <p>&#x270D;&#xFE0F; Write a word or symbol</p>
                </div>
              </div>
            )}

            {isSolving && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-xl p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div>
                    <p className="font-medium">Analyzing your drawing...</p>
                    <p className="text-xs text-white/40">Please wait a moment</p>
                  </div>
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {solutions.map((sol, i) => (
                <motion.div
                  key={sol.timestamp}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-panel rounded-xl overflow-hidden"
                >
                  <div className="flex items-start gap-4 p-4">
                    <img
                      src={sol.image}
                      alt="Drawing"
                      className="w-24 h-18 rounded-lg object-cover border border-white/10 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: sol.answer
                            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                            .replace(/\*(.*?)\*/g, "<em>$1</em>")
                            .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 rounded text-purple-300">$1</code>')
                            .replace(/\n/g, "<br/>"),
                        }}
                      />
                      <p className="text-[10px] text-white/20 mt-2">
                        {new Date(sol.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
