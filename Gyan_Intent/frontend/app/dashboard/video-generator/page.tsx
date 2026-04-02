"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle,
  Download,
  RefreshCw,
  Sparkles,
  Video,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const BUILTIN_VIDEOS: Record<string, { file: string; label: string; duration: string }> = {
  "pythagorean theorem": { file: "/videos/pythagorean.mp4", label: "Pythagorean Theorem", duration: "0:41" },
  pythagorean: { file: "/videos/pythagorean.mp4", label: "Pythagorean Theorem", duration: "0:41" },
  photosynthesis: { file: "/videos/photosynthesis.mp4", label: "Photosynthesis", duration: "0:35" },
  newton: { file: "/videos/newton.mp4", label: "Newton's Laws", duration: "0:32" },
  "newton's laws": { file: "/videos/newton.mp4", label: "Newton's Laws", duration: "0:32" },
  "laws of motion": { file: "/videos/newton.mp4", label: "Newton's Laws", duration: "0:32" },
  dna: { file: "/videos/dna.mp4", label: "DNA Replication", duration: "0:37" },
  "dna replication": { file: "/videos/dna.mp4", label: "DNA Replication", duration: "0:37" },
  "chemical bonding": { file: "/videos/bonding.mp4", label: "Chemical Bonding", duration: "0:39" },
  bonding: { file: "/videos/bonding.mp4", label: "Chemical Bonding", duration: "0:39" },
  calculus: { file: "/videos/calculus.mp4", label: "Calculus Basics", duration: "0:38" },
  "calculus basics": { file: "/videos/calculus.mp4", label: "Calculus Basics", duration: "0:38" },
};

const TOPICS = [
  "Pythagorean Theorem",
  "Photosynthesis",
  "Newton's Laws",
  "DNA Replication",
  "Chemical Bonding",
  "Calculus Basics",
];

function findBuiltinVideo(concept: string) {
  const normalized = concept.toLowerCase().trim();

  if (BUILTIN_VIDEOS[normalized]) {
    return BUILTIN_VIDEOS[normalized];
  }

  for (const [key, value] of Object.entries(BUILTIN_VIDEOS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
}

type Stage = "idle" | "generating_script" | "rendering" | "completed" | "failed";

export default function VideoGeneratorPage() {
  const [concept, setConcept] = useState("");
  const [language, setLanguage] = useState("english");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [videoReady, setVideoReady] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLabel, setVideoLabel] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const showBuiltinVideo = (inputConcept: string) => {
    const match = findBuiltinVideo(inputConcept);
    if (!match) return false;
    setVideoUrl(`${match.file}?v=${Date.now()}`);
    setVideoLabel(match.label);
    setVideoDuration(match.duration);
    setVideoReady(true);
    setStage("completed");
    setErrorMsg(null);
    return true;
  };

  const startLiveGeneration = useCallback(async (inputConcept: string) => {
    setIsGenerating(true);
    setProgress(5);
    setStage("generating_script");
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE}/video/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: inputConcept.trim(),
          language,
          explanation: `Explain ${inputConcept.trim()} clearly for students.`,
          visual_style: "educational",
        }),
      });

      if (!res.ok) throw new Error(`Backend error (${res.status})`);
      const { job_id } = await res.json();

      // Poll for status
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`${API_BASE}/video/status/${job_id}`);
          if (!statusRes.ok) return;
          const data = await statusRes.json();

          setProgress(data.progress ?? 0);
          setStage(data.status as Stage);

          if (data.status === "completed" && data.video_url) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            // Use the proxy route to avoid CORS/range issues
            const proxyUrl = data.video_url.replace(
              /^https?:\/\/[^/]+\/media\//,
              "/api/video-proxy/"
            );
            setVideoUrl(proxyUrl);
            setVideoLabel(inputConcept.trim());
            setVideoDuration("");
            setVideoReady(true);
            setIsGenerating(false);
          } else if (data.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setErrorMsg(data.error_message || "Video generation failed");
            setIsGenerating(false);
          }
        } catch {
          // Transient network issue — keep polling
        }
      }, 3000);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to start video generation");
      setIsGenerating(false);
      setStage("failed");
    }
  }, [language]);

  const updateConcept = (value: string) => {
    setConcept(value);
    setVideoReady(false);
    setVideoUrl(null);
    setVideoLabel("");
    setVideoDuration("");
    setErrorMsg(null);
    setStage("idle");
  };

  const handleGenerate = () => {
    if (!concept.trim()) return;

    // Fast path: pre-built video
    const match = findBuiltinVideo(concept);
    if (match) {
      setIsGenerating(true);
      setProgress(0);
      setVideoReady(false);
      setVideoUrl(null);
      setErrorMsg(null);
      const totalMs = 4000;
      const tickMs = 200;
      const totalTicks = totalMs / tickMs;
      let tick = 0;
      const iv = window.setInterval(() => {
        tick += 1;
        setProgress(Math.min(Math.round((tick / totalTicks) * 100), 100));
        if (tick >= totalTicks) {
          window.clearInterval(iv);
          setIsGenerating(false);
          setProgress(100);
          showBuiltinVideo(concept);
        }
      }, tickMs);
      return;
    }

    // Live generation via backend
    setVideoReady(false);
    setVideoUrl(null);
    startLiveGeneration(concept);
  };

  const handleReset = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
    setVideoReady(false);
    setIsGenerating(false);
    setProgress(0);
    setVideoUrl(null);
    setVideoLabel("");
    setVideoDuration("");
    setErrorMsg(null);
    setConcept("");
    setStage("idle");
  };

  const stageLabel = (() => {
    switch (stage) {
      case "generating_script": return "Writing script & generating Manim code…";
      case "rendering": return "Rendering video with Manim…";
      default: return "Processing…";
    }
  })();

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/dashboard" className="text-white/60 hover:text-white">
            ← Back
          </a>
          <h1 className="text-xl font-bold gradient-text">Video Generator</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="glass-panel p-6 rounded-2xl mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Video className="text-purple-400" size={20} />
                What do you want to learn?
              </h2>

              <textarea
                value={concept}
                onChange={(e) => updateConcept(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="Enter any concept... e.g. 'Pythagorean Theorem' or 'Operating Systems'"
                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/40 focus:border-purple-500 focus:outline-none resize-none mb-4"
              />

              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="text-white/60 text-sm mb-2 block">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white"
                  >
                    <option value="english">English</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!concept.trim() || isGenerating}
                className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 transition"
              >
                <Sparkles size={20} />
                {isGenerating ? `Generating... ${progress}%` : "Generate Video"}
              </button>
            </div>

            <div className="glass-panel p-4 rounded-xl">
              <p className="text-white/60 text-sm mb-3">Quick topics (instant):</p>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => updateConcept(topic)}
                    className="px-3 py-1.5 rounded-full text-sm bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 transition"
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-xs mt-3">
                Or type any concept — a live Manim video will be generated on the fly (~60s).
              </p>
            </div>
          </div>

          <div>
            <div className="glass-panel p-6 rounded-2xl h-full">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Video className="text-cyan-400" size={20} />
                Generated Video
              </h2>

              {/* Idle placeholder */}
              {!isGenerating && !videoReady && !errorMsg && (
                <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center border border-dashed border-white/20">
                  <div className="text-center text-white/40">
                    <Video size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Your video will appear here</p>
                    <p className="text-sm">Pick a topic or type any concept and click Generate</p>
                  </div>
                </div>
              )}

              {/* In-progress */}
              {isGenerating && (
                <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center border border-purple-500/30">
                  <div className="text-center px-6">
                    <Loader2 size={36} className="mx-auto mb-3 text-purple-400 animate-spin" />
                    <div className="text-3xl font-semibold text-white mb-3">{progress}%</div>
                    <div className="w-56 h-2 bg-white/10 rounded-full overflow-hidden mx-auto mb-4">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-white/70">{stageLabel}</p>
                    <p className="text-white/40 text-sm mt-1">
                      {findBuiltinVideo(concept) ? "Almost done…" : "Live Manim generation — this may take ~60 seconds"}
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {errorMsg && !isGenerating && !videoReady && (
                <div className="aspect-video bg-red-900/20 rounded-xl flex items-center justify-center border border-red-500/30">
                  <div className="text-center px-6">
                    <AlertTriangle size={36} className="mx-auto mb-3 text-red-400" />
                    <p className="text-red-400 font-medium mb-1">Generation failed</p>
                    <p className="text-white/50 text-sm mb-4">{errorMsg}</p>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Completed video */}
              {videoReady && videoUrl && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <video
                    ref={videoRef}
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    autoPlay
                    preload="auto"
                    className="w-full aspect-video rounded-xl bg-black mb-4"
                  />

                  <div className="bg-white/5 rounded-lg p-4 mb-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <BookOpen size={16} className="text-cyan-400" />
                      Video Explanation
                    </h4>
                    <p className="text-white/70 text-sm">
                      This Manim animation explains <strong>{videoLabel}</strong> with step-by-step visual demonstrations.
                    </p>
                    {videoDuration && <p className="text-white/50 text-xs mt-2">Duration: {videoDuration}</p>}
                  </div>

                  <div className="flex gap-3">
                    <a
                      href={videoUrl}
                      download={`${videoLabel}.mp4`}
                      className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 transition"
                    >
                      <Download size={18} />
                      Download
                    </a>
                    <button
                      onClick={handleReset}
                      className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 transition"
                    >
                      <RefreshCw size={18} />
                      Generate New
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-4 text-green-400 text-sm">
                    <CheckCircle size={16} />
                    Video generated successfully!
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}