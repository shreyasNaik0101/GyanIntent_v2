"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Smartphone,
  Globe,
  CheckCircle,
  Copy,
  Camera,
  Video,
  BookOpen,
} from "lucide-react";

export default function TelegramPage() {
  const [botUsername] = useState("@Gyan_Intent_bot");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(botUsername);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    {
      icon: Camera,
      title: "Photo Doubts",
      description: "Send a photo of your doubt, get a video explanation back",
    },
    {
      icon: Video,
      title: "Video Explanations",
      description: "Receive AI-generated educational videos directly in Telegram",
    },
    {
      icon: BookOpen,
      title: "Hinglish Support",
      description: "Ask questions in Hindi, English, or Hinglish",
    },
    {
      icon: Globe,
      title: "Works Everywhere",
      description: "Access from any device - mobile, tablet, or desktop",
    },
  ];

  const sampleConversation = [
    { type: "user", message: "video photosynthesis" },
    { type: "bot", message: "🎬 Generating video on photosynthesis... This will take ~1 minute." },
    { type: "bot", message: "📹 [Video: 73-second Manim animation explaining photosynthesis]" },
    { type: "user", message: "What is Newton's first law?" },
    { type: "bot", message: "Newton's First Law (Law of Inertia): An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force. 🎯\n\nExample: A book on a table stays there until you push it!" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/dashboard" className="text-white/60 hover:text-white">
            ← Back
          </a>
          <h1 className="text-xl font-bold gradient-text">Telegram Bot</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
              <Send size={40} />
            </div>
            <h2 className="text-3xl font-bold mb-2">Gyan_Intent - AI Tutor Bot</h2>
            <p className="text-white/60 max-w-xl mx-auto">
              Free AI-powered learning assistant. Get educational videos, solve math problems,
              and learn concepts in Hinglish. Works 24/7!
            </p>
          </motion.div>
        </div>

        {/* Bot Username Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 rounded-2xl max-w-md mx-auto mb-12"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm mb-1">Telegram Bot</p>
              <p className="text-2xl font-bold">{botUsername}</p>
            </div>
            <button
              onClick={handleCopy}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition"
            >
              {copied ? <CheckCircle className="text-green-400" size={24} /> : <Copy size={24} />}
            </button>
          </div>
          <a
            href="https://t.me/Gyan_Intent_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center gap-2"
          >
            <Send size={18} />
            Open in Telegram
          </a>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="glass-panel p-5 rounded-xl"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <feature.icon className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-white/60 text-sm">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Demo Conversation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-xl font-semibold mb-4 text-center">How it works</h3>
          <div className="glass-panel p-6 rounded-2xl max-w-lg mx-auto">
            <div className="space-y-4">
              {sampleConversation.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.type === "user" ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.15 }}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.type === "user"
                        ? "bg-blue-600 rounded-br-md"
                        : "bg-white/10 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{msg.message}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-12 max-w-2xl mx-auto">
          {[
            { value: "Free", label: "Forever" },
            { value: "24/7", label: "Available" },
            { value: "∞", label: "Messages" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl font-bold text-blue-400">{stat.value}</p>
              <p className="text-white/60 text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
