"use client";

import Link from "next/link";
import { useUserStats } from "@/hooks/useUserStats";
import {
  Video,
  MessageCircle,
  Sparkles,
  Play,
  ArrowRight,
  Zap,
  TrendingUp,
  Clock,
} from "lucide-react";

export default function Dashboard() {
  const { stats: liveStats } = useUserStats();
  const stats = {
    videosGenerated: liveStats.videosWatched,
    streak: liveStats.streak,
    points: liveStats.points,
  };

  const features = [
    {
      icon: Video,
      title: "Video Generator",
      description: "AI-powered Manim animations for any concept",
      href: "/dashboard/video-generator",
      color: "from-purple-500 to-pink-500",
      stats: `${stats.videosGenerated} videos`,
    },
    {
      icon: Play,
      title: "Insta Pipeline",
      description: "Swipe through educational videos with live reactions",
      href: "/dashboard/insta-pipeline",
      color: "from-fuchsia-500 to-rose-500",
      stats: "Video feed",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Bot",
      description: "AI-powered learning on WhatsApp",
      href: "/dashboard/whatsapp",
      color: "from-green-500 to-emerald-500",
      stats: "WhatsApp Bot",
    },
  ];

  const recentVideos = [
    { title: "Pythagorean Theorem", duration: "0:30", subject: "Mathematics", color: "from-purple-500 to-pink-500", url: "/videos/pythagorean.mp4", thumbnail: "/videos/pythagorean-thumb.jpg" },
    { title: "Chemical Bonding", duration: "0:30", subject: "Chemistry", color: "from-cyan-500 to-blue-500", url: "/videos/bonding.mp4", thumbnail: "/videos/bonding-thumb.jpg" },
    { title: "Newton's Laws", duration: "0:30", subject: "Physics", color: "from-blue-500 to-indigo-500", url: "/videos/newton.mp4", thumbnail: "/videos/newton-thumb.jpg" },
    { title: "DNA Replication", duration: "0:30", subject: "Biology", color: "from-orange-500 to-amber-500", url: "/videos/dna.mp4", thumbnail: "/videos/dna-thumb.jpg" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/50 via-pink-900/30 to-purple-900/50 border border-purple-500/20 p-8">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-white/60 text-lg mb-4">
            Ready to continue your learning journey?
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-400">
              <span className="text-2xl">🔥</span>
              <span className="font-semibold">{stats.streak} day streak!</span>
            </div>
            <Link
              href="/dashboard/video-generator"
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition flex items-center gap-2"
            >
              <Sparkles size={18} />
              Start Learning
            </Link>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20">
          <div className="w-32 h-32 rounded-full bg-purple-500 blur-3xl" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Videos Generated", value: stats.videosGenerated, icon: Video, color: "text-purple-400", bg: "from-purple-500/20 to-purple-500/5" },
          { label: "Day Streak", value: stats.streak, icon: Zap, color: "text-yellow-400", bg: "from-yellow-500/20 to-yellow-500/5" },
          { label: "Total Points", value: stats.points, icon: Sparkles, color: "text-cyan-400", bg: "from-cyan-500/20 to-cyan-500/5" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.bg} border border-white/5 rounded-2xl p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={stat.color} size={22} />
              <TrendingUp className="text-green-400/50" size={16} />
            </div>
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-white/40 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Features</h2>
          <Link href="/dashboard/features" className="text-purple-400 text-sm hover:text-purple-300 transition">
            View all →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <div key={feature.title}>
              <Link
                href={feature.href}
                className="block glass-panel p-5 rounded-2xl hover:border-purple-500/50 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon size={24} />
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-purple-400 transition">
                  {feature.title}
                </h3>
                <p className="text-white/40 text-sm mb-3">{feature.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-400">{feature.stats}</span>
                  <ArrowRight className="text-white/20 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" size={16} />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Videos */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Videos</h2>
            <Link href="/dashboard/insta-pipeline" className="text-purple-400 text-sm hover:text-purple-300 transition">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentVideos.map((video, i) => (
              <a
                key={video.title}
                href={video.url}
                className="glass-panel p-4 rounded-xl flex items-center gap-4 hover:border-purple-500/50 transition cursor-pointer group block"
              >
                <div className="w-20 h-14 rounded-lg overflow-hidden relative shrink-0 bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play size={20} className="text-white/60 group-hover:text-white group-hover:scale-110 transition" fill="currentColor" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium group-hover:text-purple-400 transition truncate">{video.title}</h4>
                  <p className="text-white/40 text-sm">{video.subject}</p>
                </div>
                <div className="flex items-center gap-2 text-white/30 text-sm shrink-0">
                  <Clock size={14} />
                  {video.duration}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Quick Actions & Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/dashboard/video-generator"
                className="block glass-panel p-4 rounded-xl hover:border-purple-500/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition">
                    <Video size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-purple-400 transition">Generate Video</p>
                    <p className="text-white/40 text-xs">Explain any concept</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/dashboard/insta-pipeline"
                className="block glass-panel p-4 rounded-xl hover:border-fuchsia-500/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-fuchsia-500/20 flex items-center justify-center group-hover:scale-110 transition">
                    <Play size={18} className="text-fuchsia-300" />
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-fuchsia-300 transition">Open Feed</p>
                    <p className="text-white/40 text-xs">Browse cached short videos</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Today's Activity */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Today's Activity</h2>
            <div className="glass-panel rounded-xl p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-white/60 text-sm">Watched cached learning videos</span>
                  <span className="text-white/30 text-xs ml-auto">2h ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-white/60 text-sm">Generated a new concept video</span>
                  <span className="text-white/30 text-xs ml-auto">4h ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-white/60 text-sm">Earned 50 points</span>
                  <span className="text-white/30 text-xs ml-auto">6h ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
