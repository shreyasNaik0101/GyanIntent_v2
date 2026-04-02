"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Trash2,
  Globe,
  Bot,
  User,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  Square,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिंदी", flag: "🇮🇳" },
  { code: "kn", label: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "hinglish", label: "Hinglish", flag: "🔤" },
];

const SUGGESTIONS = [
  "Explain photosynthesis in simple terms",
  "What is recursion in programming?",
  "Solve: 2x + 5 = 15",
  "Newton's laws of motion",
  "What is machine learning?",
  "Explain DNA replication",
];

const LANG_CODES: Record<string, string> = { en: "en-IN", hi: "hi-IN", kn: "kn-IN", hinglish: "hi-IN" };

function formatTextForSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " Let's skip the code snippet for now. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[•·▪▫]/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim()
    .slice(0, 450);
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const playbackTokenRef = useRef(0);
  const mountedRef = useRef(true);

  // Refs to avoid stale closures in async callbacks
  const messagesRef = useRef<Message[]>([]);
  const languageRef = useRef(language);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { languageRef.current = language; }, [language]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stopPlayback = useCallback(() => {
    playbackTokenRef.current += 1;
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.src = "";
      audioPlayerRef.current = null;
    }

    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }

    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setSpeakingIdx(null);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup on unmount: stop all audio/recording when navigating away
  useEffect(() => {
    mountedRef.current = true;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPlayback();
      }
    };

    window.addEventListener("pagehide", stopPlayback);
    window.addEventListener("beforeunload", stopPlayback);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("pagehide", stopPlayback);
      window.removeEventListener("beforeunload", stopPlayback);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopPlayback();
      if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") { mediaRecorderRef.current.stop(); }
      if (recordTimerRef.current) { clearTimeout(recordTimerRef.current); }
    };
  }, [stopPlayback]);

  // ─── Core send function using refs (no stale closures) ───
  // autoSpeak: if true, fires TTS immediately when reply arrives (no delay)
  const sendText = useCallback(async (text: string, autoSpeak = false) => {
    stopPlayback();
    const userMsg: Message = { role: "user", content: text };
    const currentMessages = [...messagesRef.current, userMsg];
    setMessages(currentMessages);
    setInput("");
    setIsLoading(true);
    setIsTranscribing(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          language: languageRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (!mountedRef.current) return null;
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      // Fire TTS immediately (non-blocking) so audio starts while user reads
      if (autoSpeak) speakTextRef.current(data.reply);
      return data.reply as string;
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
      return null;
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, []);

  // ─── Send text message (for typed input) ───
  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    await sendText(msg);
  };

  // ─── Fallback: MediaRecorder + Sarvam STT ───
  const startFallbackRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) { clearTimeout(recordTimerRef.current); recordTimerRef.current = null; }
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          formData.append("language", languageRef.current);
          const res = await fetch("/api/speech-to-text", { method: "POST", body: formData });
          const data = await res.json();
          if (res.ok && data.transcript) {
            await sendText(data.transcript, true);
          } else {
            setIsTranscribing(false);
            setMessages((prev) => [...prev, { role: "assistant", content: "Could not understand the audio. Please try again or type your question." }]);
          }
        } catch {
          setIsTranscribing(false);
          setMessages((prev) => [...prev, { role: "assistant", content: "Voice transcription failed. Please type your question instead." }]);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setInput("");

      // Auto-stop after 10 seconds for better capture
      recordTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      }, 10000);
    } catch (err) {
      console.error("Mic access denied:", err);
      setIsRecording(false);
    }
  }, [sendText]);

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      startFallbackRecording();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = LANG_CODES[languageRef.current] || "en-IN";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = async (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      if (interimTranscript) setInput(interimTranscript);
      if (finalTranscript.trim()) {
        recognitionRef.current = null;
        setInput("");
        setIsRecording(false);
        await sendText(finalTranscript.trim(), true);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "network" || event.error === "service-not-allowed" || event.error === "not-allowed") {
        recognitionRef.current = null;
        setIsRecording(false);
        startFallbackRecording();
        return;
      }
      if (event.error === "no-speech" || event.error === "aborted") return;
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setInput("");
    } catch {
      startFallbackRecording();
    }
  }, [startFallbackRecording, sendText]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      return; // let onstop handle the transcription
    }
    if (recordTimerRef.current) { clearTimeout(recordTimerRef.current); recordTimerRef.current = null; }
    setIsRecording(false);
    setInput("");
  }, []);

  // ─── Text-to-Speech ───
  const speakTextRef = useRef<(text: string, idx?: number) => void>(() => {});
  const speakText = async (text: string, idx?: number) => {
    if (isSpeaking) {
      stopPlayback();
      return;
    }

    const requestToken = playbackTokenRef.current + 1;
    playbackTokenRef.current = requestToken;

    setIsSpeaking(true);
    if (idx !== undefined) setSpeakingIdx(idx);

    const cleanText = formatTextForSpeech(text);

    const finalizePlayback = () => {
      if (!mountedRef.current || playbackTokenRef.current !== requestToken) {
        return;
      }

      setIsSpeaking(false);
      setSpeakingIdx(null);
      ttsAbortRef.current = null;
    };

    try {
      const controller = new AbortController();
      ttsAbortRef.current = controller;
      const res = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, language: languageRef.current }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!mountedRef.current || playbackTokenRef.current !== requestToken) {
        return;
      }

      // Play the base64 audio
      const audioBytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
      const blob = new Blob([audioBytes], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      audioObjectUrlRef.current = url;
      const audio = new Audio(url);
      audioPlayerRef.current = audio;

      audio.onended = () => {
        if (audioObjectUrlRef.current === url) {
          URL.revokeObjectURL(url);
          audioObjectUrlRef.current = null;
        }
        finalizePlayback();
      };
      audio.onerror = () => {
        if (audioObjectUrlRef.current === url) {
          URL.revokeObjectURL(url);
          audioObjectUrlRef.current = null;
        }
        finalizePlayback();
      };

      await audio.play();
    } catch (error: any) {
      if (error?.name === "AbortError" || playbackTokenRef.current !== requestToken || !mountedRef.current) {
        return;
      }

      finalizePlayback();
    }
  };

  speakTextRef.current = speakText;

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles size={24} className="text-purple-400" />
            Chat Assistant
          </h2>
          <p className="text-white/50 text-sm">
            Type or speak in {currentLang.label} — chat, speech, and voice replies powered by Sarvam AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel border border-white/10 hover:border-purple-500/30 transition text-sm"
            >
              <Globe size={16} className="text-purple-400" />
              <span>{currentLang.flag} {currentLang.label}</span>
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 top-12 z-50 w-48 rounded-xl glass-panel border border-white/10 overflow-hidden shadow-2xl"
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLanguage(l.code); setShowLangMenu(false); }}
                      className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition ${
                        language === l.code
                          ? "bg-purple-500/20 text-purple-400"
                          : "hover:bg-white/5 text-white/70"
                      }`}
                    >
                      <span className="text-lg">{l.flag}</span>
                      <span>{l.label}</span>
                      {language === l.code && <span className="ml-auto text-purple-400">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:text-white/60 hover:bg-white/5 transition text-sm"
            >
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl glass-panel border border-white/5 p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <Bot size={32} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">How can I help you today?</h3>
            <p className="text-white/40 text-sm mb-2 max-w-md">
              Ask me anything about your studies. I can explain concepts, solve problems, and help you learn — in your preferred language!
            </p>
            <p className="text-white/30 text-xs mb-6 flex items-center gap-1">
              <Mic size={12} /> Tap the mic to speak, or type below
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-3 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-purple-500/10 hover:text-purple-400 border border-white/5 hover:border-purple-500/20 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-purple-500/20 border border-purple-500/30 text-white p-4"
                  : "bg-white/5 border border-white/10 text-white/80"
              }`}
            >
              {msg.role === "assistant" ? (
                <>
                  <div className="p-4 pb-2">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 rounded text-purple-300 text-xs">$1</code>')
                          .replace(/\n/g, "<br/>"),
                      }}
                    />
                  </div>
                  <div className="px-4 pb-3 pt-1 border-t border-white/5">
                    <button
                      onClick={() => speakText(msg.content, i)}
                      className={`flex items-center gap-1.5 text-xs transition ${
                        speakingIdx === i
                          ? "text-purple-400"
                          : "text-white/30 hover:text-white/60"
                      }`}
                    >
                      {speakingIdx === i ? (
                        <>
                          <Square size={12} fill="currentColor" />
                          <span>Stop</span>
                          <span className="flex gap-0.5 ml-1">
                            <span className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" />
                            <span className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                            <span className="w-1 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                          </span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={12} />
                          <span>Listen</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div
                  className="p-4"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.*?)\*/g, "<em>$1</em>")
                      .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 rounded text-purple-300 text-xs">$1</code>')
                      .replace(/\n/g, "<br/>"),
                  }}
                />
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0 mt-1">
                <User size={16} className="text-white" />
              </div>
            )}
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-white/40">
                  {isTranscribing ? "Transcribing..." : "Thinking..."}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="mt-4 flex gap-3 items-center">
        {/* Mic button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading || isTranscribing}
          className={`p-3.5 rounded-xl transition shrink-0 ${
            isRecording
              ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
              : "bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10"
          } disabled:opacity-40`}
          title={isRecording ? "Stop recording" : "Start voice input"}
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={isRecording ? "Listening..." : isTranscribing ? "Transcribing..." : `Ask anything in ${currentLang.label}...`}
            disabled={isLoading || isRecording || isTranscribing}
            className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition disabled:opacity-50"
          />
          {isRecording && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
              <span className="w-1 h-3 bg-red-400 rounded-full animate-pulse" />
              <span className="w-1 h-5 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
              <span className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: "450ms" }} />
            </div>
          )}
          {!isRecording && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/20">
              {currentLang.flag}
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim() || isRecording}
          className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-400 hover:to-pink-400 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/20"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
