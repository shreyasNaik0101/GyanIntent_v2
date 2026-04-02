"use client";

import { useState } from "react";
import { useUserStats } from "@/hooks/useUserStats";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Video,
  MessageCircle,
  Sparkles,
  Home,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Bot,
} from "lucide-react";

const navItems = [
  {
    section: "Main",
    items: [
      { icon: Home, label: "Dashboard", href: "/dashboard" },
      { icon: Video, label: "Video Generator", href: "/dashboard/video-generator" },
      { icon: Video, label: "Insta Pipeline", href: "/dashboard/insta-pipeline" },
      { icon: FileText, label: "YouTube Transcriber", href: "/dashboard/transcriber" },
      { icon: Bot, label: "Chat Assistant", href: "/dashboard/chat" },
      { icon: MessageCircle, label: "WhatsApp Bot", href: "/dashboard/whatsapp" },
    ],
  },
  {
    section: "Learning",
    items: [
      { icon: Sparkles, label: "Docs", href: "/docs" },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  // Dynamic user stats from localStorage
  const { stats: liveStats } = useUserStats();
  const userStats = {
    name: "Anshul",
    initials: "AN",
    points: liveStats.points,
    streak: liveStats.streak,
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        className="fixed left-0 top-0 h-screen bg-[#0a0a12] border-r border-white/5 flex flex-col z-50"
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-bold gradient-text"
              >
                Gyan_Intent
              </motion.span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map((section) => (
            <div key={section.section} className="mb-6">
              {!collapsed && (
                <p className="text-xs text-white/30 uppercase tracking-wider px-3 mb-2">
                  {section.section}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const isHovered = hoveredItem === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onMouseEnter={() => setHoveredItem(item.href)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                        ${isActive 
                          ? "bg-gradient-to-r from-purple-500/20 to-pink-500/10 text-white border border-purple-500/30" 
                          : "text-white/60 hover:text-white hover:bg-white/5"
                        }
                      `}
                    >
                      <div
                        className={`
                          w-8 h-8 rounded-lg flex items-center justify-center transition-all
                          ${isActive 
                            ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white" 
                            : isHovered 
                              ? "bg-white/10" 
                              : "bg-white/5"
                          }
                        `}
                      >
                        <item.icon size={18} />
                      </div>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="font-medium text-sm"
                        >
                          {item.label}
                        </motion.span>
                      )}
                      {isActive && !collapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-white/5 space-y-1">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Settings size={18} />
            </div>
            {!collapsed && <span className="font-medium text-sm">Settings</span>}
          </Link>
          
          <Link
            href="/signin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <LogOut size={18} />
            </div>
            {!collapsed && <span className="font-medium text-sm">Sign Out</span>}
          </Link>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-purple-500/50 transition"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>

      {/* Main Content */}
      <motion.main
        initial={false}
        animate={{ marginLeft: collapsed ? 72 : 256 }}
        className="flex-1 min-h-screen"
      >
        {/* Top Bar */}
        <header className="sticky top-0 bg-black/80 backdrop-blur-xl border-b border-white/5 z-40">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">
                {navItems.flatMap(s => s.items).find(i => i.href === pathname)?.label || "Dashboard"}
              </h1>
              <p className="text-white/40 text-sm">AI-powered learning platform</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* User Avatar */}
              <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-sm group-hover:scale-110 transition">
                  {userStats.initials}
                </div>
                {!collapsed && (
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium">{userStats.name}</p>
                    <p className="text-xs text-white/40">View Profile</p>
                  </div>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
