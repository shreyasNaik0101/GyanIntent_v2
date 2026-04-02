"use client";

import { motion } from "framer-motion";
import { TrendingUp, Trophy, Video, Target, Calendar, BookOpen, Link2, Loader2, CheckCircle, GraduationCap, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { useGoogleClassroom } from "@/hooks/useGoogleClassroom";
import dynamic from "next/dynamic";

const ProgressScene = dynamic(() => import("@/components/progress/ProgressScenes"), {
  ssr: false,
  loading: () => <div className="w-full h-[300px] rounded-2xl bg-white/5 animate-pulse" />,
});

export default function ProgressPage() {
  const [mode, setMode] = useState<"edu" | "classroom">("edu"); // Default to edu
  const [progressData, setProgressData] = useState({
    total_courses: 0,
    total_assignments: 0,
    completed_assignments: 0,
    pending_assignments: 0,
    completion_rate: 0,
  });
  const [classroomSubjects, setClassroomSubjects] = useState<{name: string, progress: number, color: string}[]>([]);
  
  const { 
    isConnected, 
    isLoading: isConnecting, 
    connect, 
    disconnect,
    fetchProgress,
    fetchCourses 
  } = useGoogleClassroom();

  useEffect(() => {
    if (isConnected && mode === "classroom") {
      loadProgress();
    }
  }, [isConnected, mode]);

  const loadProgress = async () => {
    const progress = await fetchProgress();
    if (progress) {
      setProgressData(progress);
    }
    
    // Also fetch courses to get real subjects
    const courses = await fetchCourses();
    const colors = ["from-purple-500 to-pink-500", "from-blue-500 to-cyan-500", "from-green-500 to-emerald-500", "from-orange-500 to-amber-500"];
    const subjects = courses.map((course: any, i: number) => ({
      name: course.name,
      progress: Math.floor(Math.random() * 60) + 20, // Placeholder progress
      color: colors[i % colors.length],
    }));
    setClassroomSubjects(subjects);
  };

  const stats = [
    { label: "Google Classroom Courses", value: progressData.total_courses, icon: BookOpen, color: "text-blue-400" },
    { label: "Total Assignments", value: progressData.total_assignments, icon: Target, color: "text-purple-400" },
    { label: "Completed", value: progressData.completed_assignments, icon: Trophy, color: "text-amber-400" },
    { label: "Completion Rate", value: `${Math.round(progressData.completion_rate)}%`, icon: TrendingUp, color: "text-green-400" },
  ];

  // Static demo stats (shown when not connected)
  const demoStats = [
    { label: "Videos Watched", value: 45, icon: Video, color: "text-purple-400" },
    { label: "Quizzes Completed", value: 28, icon: Trophy, color: "text-amber-400" },
    { label: "Study Hours", value: 67, icon: Calendar, color: "text-cyan-400" },
    { label: "Accuracy Rate", value: "85%", icon: Target, color: "text-green-400" },
  ];

  // Choose which stats to display based on mode
  const displayStats = mode === "classroom" && isConnected ? stats : demoStats;

  // Demo subjects for Total Courses mode
  const demoSubjects = [
    { name: "Mathematics", progress: 85, color: "from-purple-500 to-pink-500" },
    { name: "Physics", progress: 70, color: "from-blue-500 to-cyan-500" },
    { name: "Biology", progress: 90, color: "from-green-500 to-emerald-500" },
    { name: "Chemistry", progress: 65, color: "from-orange-500 to-amber-500" },
  ];

  // Choose which subjects to display based on mode
  const displaySubjects = mode === "classroom" && isConnected && classroomSubjects.length > 0 
    ? classroomSubjects 
    : demoSubjects;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Progress</h2>
          <p className="text-white/60">Track your learning progress and achievements</p>
        </div>
        
        {/* Mode Selector */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setMode("edu")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              mode === "edu"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
            }`}
          >
            <GraduationCap size={16} />
            Total Courses
          </button>

          <button
            onClick={async () => {
              setMode("classroom");
              if (!isConnected) {
                try { await connect(); } catch (e) { console.error(e); }
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              mode === "classroom"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
            }`}
          >
            <BookOpen size={16} />
            Google Classroom
            {mode === "classroom" && isConnected && (
              <CheckCircle size={14} className="text-green-400" />
            )}
          </button>
        </div>
      </div>

      {/* Google Classroom Stats */}
      {isConnected && progressData.total_courses > 0 && (
        <div className="glass-panel p-4 rounded-xl border border-green-500/30 bg-green-500/5">
          <h3 className="font-medium text-green-400 mb-3 flex items-center gap-2">
            <BookOpen size={18} />
            Google Classroom Progress
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold">{progressData.total_courses}</p>
              <p className="text-white/60 text-sm">Courses</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{progressData.total_assignments}</p>
              <p className="text-white/60 text-sm">Assignments</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{progressData.completed_assignments}</p>
              <p className="text-white/60 text-sm">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{Math.round(progressData.completion_rate)}%</p>
              <p className="text-white/60 text-sm">Completion Rate</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {displayStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-5 rounded-xl"
          >
            <stat.icon className={`${stat.color} mb-3`} size={24} />
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-white/60 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-4">Subject Progress</h3>
        <ProgressScene section="subjects" subjects={displaySubjects} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Learning Progress Chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="text-purple-400" />
            Learning Progress
          </h3>
          <ProgressScene section="weekly" />
        </div>

        {/* Streak & Achievements */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Trophy className="text-amber-400" />
            Achievements
          </h3>
          <ProgressScene section="achievements" />
        </div>
      </div>
    </div>
  );
}

// Weekly Chart Component
function WeeklyChart() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const values = [65, 80, 45, 90, 70, 55, 85]; // Demo values
  const maxValue = Math.max(...values);
  
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between h-40 gap-2">
        {days.map((day, i) => (
          <div key={day} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(values[i] / maxValue) * 100}%` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg relative group"
              style={{ minHeight: '20px' }}
            >
              <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-white/60 opacity-0 group-hover:opacity-100 transition">
                {values[i]}%
              </span>
            </motion.div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-white/50">
        {days.map(day => <span key={day}>{day}</span>)}
      </div>
    </div>
  );
}

// Achievements Component
function AchievementsList() {
  const achievements = [
    { icon: "🔥", title: "7 Day Streak", desc: "Keep learning daily!", color: "from-orange-500 to-red-500" },
    { icon: "📚", title: "Course Master", desc: "Completed 3 courses", color: "from-blue-500 to-cyan-500" },
    { icon: "🎯", title: "Quiz Champion", desc: "90% accuracy", color: "from-purple-500 to-pink-500" },
    { icon: "⭐", title: "Top Learner", desc: "Top 10% this week", color: "from-yellow-500 to-amber-500" },
  ];
  
  return (
    <div className="grid grid-cols-2 gap-3">
      {achievements.map((a, i) => (
        <motion.div
          key={a.title}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{a.icon}</span>
            <span className="text-sm font-medium">{a.title}</span>
          </div>
          <p className="text-xs text-white/50">{a.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}
