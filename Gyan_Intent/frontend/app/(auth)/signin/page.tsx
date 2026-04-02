"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Chrome,
  Github,
} from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock authentication - in production, call your auth API
    if (email && password) {
      // Store auth state
      localStorage.setItem("edu_id_user", JSON.stringify({
        name: email.split("@")[0],
        email,
        id: "user_" + Date.now(),
      }));
      router.push("/dashboard");
    } else {
      setError("Please enter email and password");
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    // Simulate OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 1500));
    localStorage.setItem("edu_id_user", JSON.stringify({
      name: "Google User",
      email: "user@gmail.com",
      id: "google_" + Date.now(),
    }));
    router.push("/dashboard");
  };

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    // Simulate OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 1500));
    localStorage.setItem("edu_id_user", JSON.stringify({
      name: "GitHub User",
      email: "user@github.com",
      id: "github_" + Date.now(),
    }));
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="text-purple-400" size={32} />
            <span className="text-2xl font-bold">Gyan_Intent</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Learn Smarter,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              Not Harder
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-md">
            AI-powered education platform with gesture quizzes, video generation, 
            and personalized learning paths.
          </p>

          <div className="flex gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-3xl font-bold text-cyan-400">10K+</p>
              <p className="text-white/60 text-sm">Students</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-3xl font-bold text-purple-400">500+</p>
              <p className="text-white/60 text-sm">Videos</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-3xl font-bold text-pink-400">50+</p>
              <p className="text-white/60 text-sm">Topics</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-white/50 text-sm">
          © 2026 Gyan_Intent. Making education accessible.
        </div>
      </div>

      {/* Right Panel - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <Sparkles className="text-purple-500" size={28} />
            <span className="text-xl font-bold gradient-text">Gyan_Intent</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
            <p className="text-white/60">Sign in with your EDU ID to continue</p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-black font-medium hover:bg-gray-100 transition disabled:opacity-50"
            >
              <Chrome size={20} />
              Continue with Google
            </button>
            <button
              onClick={handleGithubSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/10 border border-white/20 font-medium hover:bg-white/20 transition disabled:opacity-50"
            >
              <Github size={20} />
              Continue with GitHub
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-black text-white/40">or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-white/60">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@edu.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/60">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-white/60">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-purple-400 hover:text-purple-300 transition">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl py-3 font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-white/60">
            Don't have an EDU ID?{" "}
            <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-medium transition">
              Sign Up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
