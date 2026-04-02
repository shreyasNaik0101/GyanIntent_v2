"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Smartphone,
  CheckCircle,
  Copy,
  Camera,
  Video,
  BookOpen,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function WhatsAppPage() {
  const [phoneNumber] = useState("+91 7366 868724");
  const [copied, setCopied] = useState(false);
  const [botStatus, setBotStatus] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch bot status and QR code
  const fetchBotData = async () => {
    try {
      // 1. Fetch overall status
      const statusRes = await fetch(`${API_BASE}/whatsapp/bot-status`);
      const statusData = await statusRes.json();
      setBotStatus(statusData);

      // 2. Fetch QR code if not connected
      if (statusData.whatsapp_connection !== 'ready' && statusData.whatsapp_connection !== 'authenticated') {
        const qrRes = await fetch(`${API_BASE}/whatsapp/qr`);
        const qrData = await qrRes.json();
        
        // We only show the QR if the bot is actually awaiting connection and has the QR code
        if (qrData.available && qrData.qr) {
          setQrCode(qrData.qr);
          // Set status artificially to connecting so it doesn't just show 'Bot Offline' block
          if (statusData.status === 'unhealthy' || statusData.status === 'offline') {
            setBotStatus({
              ...statusData,
              status: 'online', 
              whatsapp_connection: 'pending_scan'
            });
            return;
          }
        } else {
          setQrCode(null);
        }
      } else {
        setQrCode(null); // Clear QR if connected
      }
    } catch (error) {
      console.error("Failed to fetch bot data:", error);
      setBotStatus({ status: 'offline', whatsapp_connection: 'disconnected' });
      setQrCode(null);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 3 seconds
  useEffect(() => {
    fetchBotData();
    const interval = setInterval(fetchBotData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(phoneNumber.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    {
      icon: Camera,
      title: "Interactive Explanations",
      description: "Ask questions, get detailed concepts explained in Hinglish.",
    },
    {
      icon: Video,
      title: "Video Generation",
      description: "Type 'video [topic]' to receive an AI-generated educational video.",
    },
    {
      icon: BookOpen,
      title: "Math Solver",
      description: "Send math equations and get step-by-step solutions instantly.",
    },
    {
      icon: Smartphone,
      title: "Any Phone, Any Network",
      description: "No app installation required. Works entirely within WhatsApp.",
    },
  ];

  // Determine connection badge color
  const getStatusBadge = () => {
    if (loading && !botStatus) return <span className="text-gray-400 flex items-center gap-1"><RefreshCw size={14} className="animate-spin" /> Checking...</span>;
    if (!botStatus || botStatus.status === 'offline') return <span className="text-red-400 flex items-center gap-1"><AlertCircle size={14} /> Offline</span>;
    
    switch (botStatus?.whatsapp_connection) {
      case "ready":
      case "authenticated":
        return (
          <span className="text-green-400 flex items-center gap-1">
            <CheckCircle size={14} /> Connected & Ready
          </span>
        );
      case "connecting":
        return (
          <span className="text-yellow-400 flex items-center gap-1">
            <RefreshCw size={14} className="animate-spin" /> Connecting...
          </span>
        );
      default:
        return (
          <span className="text-yellow-400 flex items-center gap-1">
            <AlertCircle size={14} /> {botStatus?.whatsapp_connection || "Pending"}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-white/60 hover:text-white">
              ← Back
            </a>
            <h1 className="text-xl font-bold gradient-text">WhatsApp Bot Integration</h1>
          </div>
          <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-sm font-medium">
            {getStatusBadge()}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6">
              <MessageCircle size={40} className="text-black" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Gyan_Intent on WhatsApp</h2>
            <p className="text-white/60 max-w-xl mx-auto">
              A fully autonomous educational bot. Connect your WhatsApp to start answering student queries, solving math problems, and generating videos on the fly.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start mb-12">
          {/* Left Column: Connection & QR */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Phone Number Box */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-white/60 text-sm mb-1 uppercase tracking-wider font-semibold">Bot Phone Number</p>
                  <p className="text-3xl font-bold tracking-tight">{phoneNumber}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
                >
                  {copied ? <CheckCircle className="text-green-400" size={24} /> : <Copy size={24} />}
                </button>
              </div>
            </div>

            {/* Dynamic QR Code Section */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center min-h-[350px] border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 opacity-20" />
              
              {!botStatus || loading ? (
                 <div className="flex flex-col items-center justify-center text-white/50 space-y-4">
                   <RefreshCw size={40} className="animate-spin text-green-500/50" />
                   <p>Connecting to WhatsApp service...</p>
                 </div>
              ) : (botStatus.status === 'offline' || botStatus.status === 'error') ? (
                 <div className="flex flex-col items-center justify-center text-center space-y-4">
                   <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-2">
                     <AlertCircle size={32} className="text-red-400" />
                   </div>
                   <h3 className="text-xl font-bold">Bot Offline</h3>
                   <p className="text-white/60 text-sm max-w-[250px]">
                     The whatsapp-web.js service is not running. Start it in the terminal using: <code className="bg-white/10 px-2 py-0.5 rounded text-green-300">npm run dev</code>
                   </p>
                 </div>
              ) : botStatus.whatsapp_connection === 'ready' || botStatus.whatsapp_connection === 'authenticated' ? (
                 <div className="flex flex-col items-center justify-center text-center space-y-4 w-full">
                   <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-2 relative">
                     <div className="absolute inset-0 rounded-full border-4 border-green-500/30 border-t-green-400 animate-spin" style={{ animationDuration: '3s' }} />
                     <CheckCircle size={48} className="text-green-400" />
                   </div>
                   <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Bot is Online & Ready</h3>
                   <p className="text-white/60 text-sm">
                     The bot is actively listening for messages. Send it a hi to test!
                   </p>
                   
                   <a
                     href={`https://wa.me/${phoneNumber.replace(/[\s+]/g, '')}?text=hi`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="mt-6 w-full py-3 rounded-xl font-semibold bg-white/10 hover:bg-white/20 border border-white/10 transition flex items-center justify-center gap-2"
                   >
                     <MessageCircle size={18} />
                     Send Test Message
                   </a>
                 </div>
              ) : qrCode ? (
                 <div className="flex flex-col items-center justify-center space-y-4 w-full">
                   <h3 className="text-lg font-semibold mb-2">Link WhatsApp Account</h3>
                   <div className="bg-white p-4 rounded-xl shadow-2xl shadow-green-900/20 bg-clip-padding backdrop-filter backdrop-blur-xl">
                     <img src={qrCode} alt="WhatsApp QR Code" className="w-[200px] h-[200px] hover:scale-105 transition-transform duration-500" />
                   </div>
                   <div className="text-center mt-4">
                     <ol className="text-white/60 text-sm text-left list-decimal list-inside space-y-1">
                       <li>Open WhatsApp on your phone</li>
                       <li>Go to Settings {'>'} Linked Devices</li>
                       <li>Tap "Link a Device" and scan</li>
                     </ol>
                   </div>
                 </div>
              ) : (
                 <div className="flex flex-col items-center justify-center text-white/50 space-y-4">
                   <RefreshCw size={32} className="animate-spin text-green-500/50" />
                   <p>Generating QR Code...</p>
                 </div>
              )}
            </div>
          </motion.div>

          {/* Right Column: Features */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-bold mb-6 gradient-text">Capabilities</h3>
            <div className="grid grid-cols-1 gap-4">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="glass-panel p-5 rounded-xl border border-white/5 cursor-default"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                      <feature.icon className="text-green-400" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-white/90">{feature.title}</h3>
                      <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
