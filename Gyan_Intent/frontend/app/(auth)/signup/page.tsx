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
  User,
  GraduationCap,
  CheckCircle,
} from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      if (!name || !email) {
        setError("Please fill in all fields");
        return;
      }
      setStep(2);
      setError("");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Store auth state
    localStorage.setItem("edu_id_user", JSON.stringify({
      name,
      email,
      id: "user_" + Date.now(),
      role,
    }));

    router.push("/dashboard");
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    localStorage.setItem("edu_id_user", JSON.stringify({
      name: "Google User",
      email: "user@gmail.com",
      id: "google_" + Date.now(),
      role,
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
            Start Your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              Learning Journey
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-md">
            Create your EDU ID and unlock AI-powered education tools, 
            gesture quizzes, and personalized video lessons.
          </p>

          <div className="space-y-4 mt-8">
            {[
              "Access 500+ educational videos",
              "Take gesture-based quizzes",
              "Track your learning progress",
              "Join virtual classrooms",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="text-green-400" size={20} />
                <span className="text-white/80">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/50 text-sm">
          © 2026 Gyan_Intent. Making education accessible.
        </div>
      </div>

      {/* Right Panel - Sign Up Form */}
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
            <h2 className="text-3xl font-bold mb-2">Create EDU ID</h2>
            <p className="text-white/60">Step {step} of 2 - {step === 1 ? "Basic Info" : "Set Password"}</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-purple-500" : "bg-white/10"}`}>
              1
            </div>
            <div className={`w-16 h-1 rounded ${step >= 2 ? "bg-purple-500" : "bg-white/10"}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-purple-500" : "bg-white/10"}`}>
              2
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-black font-medium hover:bg-gray-100 transition disabled:opacity-50"
            >
              <Chrome size={20} />
              Sign up with Google
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-black text-white/40">or create account manually</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-white/60">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Rahul Kumar"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                    />
                  </div>
                </div>

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
                  <label className="text-sm text-white/60">I am a</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("student")}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition ${
                        role === "student"
                          ? "border-purple-500 bg-purple-500/20 text-purple-400"
                          : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      <GraduationCap size={18} />
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("teacher")}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition ${
                        role === "teacher"
                          ? "border-purple-500 bg-purple-500/20 text-purple-400"
                          : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      <User size={18} />
                      Teacher
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                >
                  ← Back
                </button>

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
                  <p className="text-xs text-white/40">Must be at least 8 characters</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    required
                    className="w-4 h-4 mt-0.5 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-white/60">
                    I agree to the{" "}
                    <Link href="/terms" className="text-purple-400 hover:text-purple-300">Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>
                  </span>
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl py-3 font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {step === 1 ? "Continue" : "Create EDU ID"} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-white/60">
            Already have an EDU ID?{" "}
            <Link href="/signin" className="text-purple-400 hover:text-purple-300 font-medium transition">
              Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
