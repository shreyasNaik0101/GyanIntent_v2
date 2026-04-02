"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import {
  FileText,
  Loader2,
  Link as LinkIcon,
  Languages,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  List,
} from "lucide-react";

type TranscriptSegment = {
  text: string;
  start: number;
  duration: number;
};

type TranscriptResponse = {
  video_id: string;
  title: string;
  language: string;
  transcript: string;
  summary: string;
  segments: TranscriptSegment[];
};

const QUICK_EXAMPLES = [
  "https://www.youtube.com/watch?v=uthjpYKD7Ng",
  "https://youtu.be/uixA8ZXx0KU",
  "https://www.youtube.com/shorts/kKKM8Y-u7ds",
];

export default function TranscriberPage() {
  const [videoInput, setVideoInput] = useState("");
  const [languagesInput, setLanguagesInput] = useState("en");
  const [preserveFormatting, setPreserveFormatting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TranscriptResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const languageList = useMemo(
    () => {
      const normalized = Array.from(
        new Set(
          languagesInput
            .split(",")
            .map((code) => code.trim().toLowerCase())
            .filter(Boolean),
        ),
      );

      if (normalized.length === 2 && normalized.includes("en") && normalized.includes("hi")) {
        return ["en"];
      }

      return normalized;
    },
    [languagesInput],
  );

  const handleFetchTranscript = async () => {
    if (!videoInput.trim()) return;

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/youtube-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url_or_id: videoInput.trim(),
          languages: languageList.length > 0 ? languageList : undefined,
          preserve_formatting: preserveFormatting,
        }),
      });

      let data: any;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Backend returned an invalid response. Make sure the backend server is running.");
      }
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Failed to fetch transcript");
      }

      setResult(data as TranscriptResponse);
    } catch (err: any) {
      setError(err?.message || "Unable to fetch transcript");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTranscript = async () => {
    if (!result?.transcript) return;
    await navigator.clipboard.writeText(result.transcript);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const formatTimestamp = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleDownloadPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const maxLineWidth = pageWidth - margin * 2;
    let y = 20;

    const addPageIfNeeded = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 20;
      }
    };

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const pdfTitle = result.title || "YouTube Transcript";
    const titleLines = doc.splitTextToSize(pdfTitle, maxLineWidth);
    for (const line of titleLines) {
      doc.text(line, margin, y);
      y += 8;
    }
    y += 2;

    // Metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Video ID: ${result.video_id}`, margin, y);
    y += 5;
    doc.text(`Language: ${result.language}`, margin, y);
    y += 5;
    doc.text(`URL: https://www.youtube.com/watch?v=${result.video_id}`, margin, y);
    y += 5;
    doc.text(`Exported: ${new Date().toLocaleString()}`, margin, y);
    y += 10;

    // Divider
    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // AI Summary
    if (result.summary) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 20, 120);
      doc.text("AI Summary", margin, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40);
      const summaryLines = doc.splitTextToSize(result.summary, maxLineWidth);
      for (const line of summaryLines) {
        addPageIfNeeded(6);
        doc.text(line, margin, y);
        y += 5;
      }
      y += 6;

      addPageIfNeeded(12);
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
    }

    // Full transcript
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Full Transcript", margin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const transcriptLines = doc.splitTextToSize(result.transcript, maxLineWidth);
    for (const line of transcriptLines) {
      addPageIfNeeded(6);
      doc.text(line, margin, y);
      y += 5;
    }
    y += 6;

    // Divider
    addPageIfNeeded(12);
    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Timestamped segments
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Timestamped Segments", margin, y);
    y += 8;

    for (const seg of result.segments) {
      const ts = formatTimestamp(seg.start);
      const segLines = doc.splitTextToSize(seg.text, maxLineWidth - 24);
      addPageIfNeeded(6 + segLines.length * 5);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 180);
      doc.text(`[${ts}]`, margin, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(30);
      doc.setFontSize(10);
      for (const line of segLines) {
        doc.text(line, margin + 24, y);
        y += 5;
      }
      y += 3;
    }

    doc.save(`transcript_${result.video_id}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 border border-purple-500/20 bg-gradient-to-br from-purple-600/10 to-cyan-600/5">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <FileText className="text-purple-400" size={22} />
          YouTube Transcriber
        </h2>
        <p className="text-white/60 mt-2">
          Paste any YouTube URL or video ID to extract transcript text with timestamps.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-white/60 block mb-2">YouTube Link or Video ID</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
              <input
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 block mb-2">Languages (comma separated)</label>
            <div className="relative">
              <Languages className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
              <input
                value={languagesInput}
                onChange={(e) => setLanguagesInput(e.target.value)}
                placeholder="en"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={preserveFormatting}
              onChange={(e) => setPreserveFormatting(e.target.checked)}
              className="rounded border-white/20 bg-white/5"
            />
            Preserve transcript formatting tags
          </label>

          <button
            onClick={handleFetchTranscript}
            disabled={isLoading || !videoInput.trim()}
            className="w-full rounded-xl py-3 font-semibold bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Fetching transcript...
              </>
            ) : (
              <>
                <FileText size={18} />
                Get Transcript
              </>
            )}
          </button>

          <div className="pt-2">
            <p className="text-xs text-white/40 mb-2">Quick examples:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => setVideoInput(example)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-purple-500/10 transition"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5" />
              {error}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-6 min-h-[460px]">
          {!result && !isLoading && (
            <div className="h-full flex items-center justify-center text-center text-white/40">
              <div>
                <List size={42} className="mx-auto mb-3 opacity-60" />
                <p>Transcript output will appear here.</p>
                <p className="text-sm mt-1">You will get full text + line-by-line timing.</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="h-full flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent"
              />
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider">Detected</p>
                  <h3 className="font-semibold text-lg">{result.title || result.video_id}</h3>
                  <p className="text-sm text-cyan-300">Language: {result.language} &bull; {result.video_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyTranscript}
                    className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm flex items-center gap-2"
                  >
                    {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="px-3 py-2 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-sm flex items-center gap-2 text-purple-300"
                  >
                    <Download size={16} />
                    PDF
                  </button>
                </div>
              </div>

              {result.summary && (
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                  <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">AI Summary</p>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-black/30 p-4 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Full Transcript</p>
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{result.transcript}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-white/80 mb-2">Timestamped segments</p>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {result.segments.map((segment, index) => (
                    <div key={`${segment.start}-${index}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-[11px] text-cyan-300 mb-1">
                        {segment.start.toFixed(2)}s • {segment.duration.toFixed(2)}s
                      </p>
                      <p className="text-sm text-white/80">{segment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
