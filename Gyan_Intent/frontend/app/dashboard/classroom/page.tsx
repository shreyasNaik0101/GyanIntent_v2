"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useUserStats } from "@/hooks/useUserStats";
import {
  BookOpen,
  ClipboardList,
  FileText,
  Play,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Video,
  Award,
  BarChart,
} from "lucide-react";

// Course data with YouTube links
const courses = [
  {
    id: 1,
    title: "Python for Beginners",
    instructor: "Code with Harry",
    thumbnail: "https://img.youtube.com/vi/7wnove7K-ZQ/maxresdefault.jpg",
    videoUrl: "https://www.youtube.com/playlist?list=PLu0W_9lII9agICnT8t4iYVSZ3eykIAOME",
    progress: 65,
    totalLessons: 45,
    completedLessons: 29,
    category: "Programming",
  },
  {
    id: 2,
    title: "JavaScript Full Course",
    instructor: "Chai aur Code",
    thumbnail: "https://img.youtube.com/vi/sscX432bMZo/maxresdefault.jpg",
    videoUrl: "https://www.youtube.com/playlist?list=PLu71SKxNbfoBuX3f4EOACle2y-tRC5Q37",
    progress: 30,
    totalLessons: 52,
    completedLessons: 16,
    category: "Web Development",
  },
  {
    id: 3,
    title: "React.js Complete Guide",
    instructor: "Chai aur Code",
    thumbnail: "https://img.youtube.com/vi/FxgM9k1rg0Q/maxresdefault.jpg",
    videoUrl: "https://www.youtube.com/playlist?list=PLu71SKxNbfoDqgPchmvIsL4hTnJIrtige",
    progress: 0,
    totalLessons: 26,
    completedLessons: 0,
    category: "Web Development",
  },
  {
    id: 4,
    title: "Data Structures & Algorithms",
    instructor: "Apna College",
    thumbnail: "https://img.youtube.com/vi/z9bZufPHFLU/maxresdefault.jpg",
    videoUrl: "https://www.youtube.com/playlist?list=PLfqMhTWNBTe3LtFWcvwpqTkUSlB32kJop",
    progress: 0,
    totalLessons: 120,
    completedLessons: 0,
    category: "Computer Science",
  },
  {
    id: 5,
    title: "Machine Learning Full Course",
    instructor: "CampusX",
    thumbnail: "https://img.youtube.com/vi/7uwa9aPbBRU/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/playlist?list=PLKnIA16_Rmvbr7zKYQuBfsVkjoLcJgxHH",
    progress: 0,
    totalLessons: 60,
    completedLessons: 0,
    category: "AI/ML",
  },
  {
    id: 6,
    title: "Node.js Tutorial in Hindi",
    instructor: "Code with Harry",
    thumbnail: "https://img.youtube.com/vi/ohIAiuHMKMI/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=BLl32FvcdVM",
    progress: 0,
    totalLessons: 25,
    completedLessons: 0,
    category: "Backend",
  },
];

// Assignments
const assignments = [
  {
    id: 1,
    title: "Python Variables & Data Types Quiz",
    course: "Python for Beginners",
    dueDate: "2026-02-20",
    status: "pending",
    totalMarks: 100,
  },
  {
    id: 2,
    title: "Build a Calculator",
    course: "JavaScript Full Course",
    dueDate: "2026-02-22",
    status: "in_progress",
    totalMarks: 50,
  },
  {
    id: 3,
    title: "React Components Practice",
    course: "React.js Complete Guide",
    dueDate: "2026-02-25",
    status: "not_started",
    totalMarks: 75,
  },
];

// Quizzes
const quizzes = [
  {
    id: 1,
    title: "Python Basics",
    questions: 20,
    duration: "15 min",
    difficulty: "Easy",
    completed: true,
    score: 85,
  },
  {
    id: 2,
    title: "JavaScript Fundamentals",
    questions: 25,
    duration: "20 min",
    difficulty: "Medium",
    completed: false,
    score: null,
  },
  {
    id: 3,
    title: "React Hooks",
    questions: 15,
    duration: "10 min",
    difficulty: "Hard",
    completed: false,
    score: null,
  },
];

export default function Classroom() {
  const [activeTab, setActiveTab] = useState<"courses" | "assignments" | "quizzes">("courses");
  const { stats } = useUserStats();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white/60 hover:text-white">
              ← Back
            </Link>
            <h1 className="text-xl font-bold gradient-text">My Classroom</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-lg">
              <Award size={16} className="text-yellow-400" />
              <span className="text-sm">{stats.xp.toLocaleString()} XP</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center font-bold">
              S
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-500/20">
                <BookOpen size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Courses</p>
                <p className="text-2xl font-bold">{courses.length}</p>
              </div>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-cyan-500/20">
                <CheckCircle size={20} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Completed</p>
                <p className="text-2xl font-bold">
                  {courses.reduce((sum, c) => sum + c.completedLessons, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-yellow-500/20">
                <ClipboardList size={20} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Pending Tasks</p>
                <p className="text-2xl font-bold">
                  {assignments.filter((a) => a.status !== "completed").length}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/20">
                <BarChart size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Avg Score</p>
                <p className="text-2xl font-bold">
                  {quizzes.filter((q) => q.completed).length > 0
                    ? Math.round(
                        quizzes.filter((q) => q.completed).reduce((s, q) => s + (q.score || 0), 0) /
                          quizzes.filter((q) => q.completed).length
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-2 mb-6">
          {(["courses", "assignments", "quizzes"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-lg font-medium capitalize transition ${
                activeTab === tab
                  ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white"
                  : "glass-button text-white/60 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Courses Tab */}
        {activeTab === "courses" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-xl overflow-hidden group hover:border-purple-500/50 transition"
              >
                <div className="relative">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = "none";
                    }}
                  />
                  {/* Gradient fallback behind image */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-700 to-cyan-600 flex items-center justify-center -z-10">
                    <Play size={40} className="text-white/30" />
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <a
                      href={course.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition"
                    >
                      <Play size={24} fill="white" />
                    </a>
                  </div>
                  <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs bg-purple-500/80">
                    {course.category}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold mb-1">{course.title}</h3>
                  <p className="text-white/60 text-sm mb-3">{course.instructor}</p>
                  
                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60">Progress</span>
                      <span>{course.progress}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40">
                      {course.completedLessons}/{course.totalLessons} lessons
                    </span>
                    <a
                      href={course.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      <Video size={14} />
                      Watch
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-panel p-4 rounded-xl flex items-center justify-between hover:border-purple-500/30 transition"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      assignment.status === "pending"
                        ? "bg-yellow-500/20"
                        : assignment.status === "in_progress"
                        ? "bg-blue-500/20"
                        : "bg-gray-500/20"
                    }`}
                  >
                    <FileText
                      size={20}
                      className={
                        assignment.status === "pending"
                          ? "text-yellow-400"
                          : assignment.status === "in_progress"
                          ? "text-blue-400"
                          : "text-gray-400"
                      }
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold">{assignment.title}</h3>
                    <p className="text-white/60 text-sm">{assignment.course}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-white/60 text-sm flex items-center gap-1">
                      <Calendar size={14} />
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm">{assignment.totalMarks} marks</p>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition">
                    {assignment.status === "not_started" ? "Start" : "Continue"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Quizzes Tab */}
        {activeTab === "quizzes" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-4 rounded-xl"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold">{quiz.title}</h3>
                  {quiz.completed ? (
                    <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                      Completed
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">
                      New
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm text-white/60 mb-4">
                  <p className="flex items-center gap-2">
                    <AlertCircle size={14} />
                    {quiz.questions} questions
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock size={14} />
                    {quiz.duration}
                  </p>
                  <p
                    className={`inline-block px-2 py-0.5 rounded text-xs ${
                      quiz.difficulty === "Easy"
                        ? "bg-green-500/20 text-green-400"
                        : quiz.difficulty === "Medium"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {quiz.difficulty}
                  </p>
                </div>
                {quiz.completed ? (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-400">{quiz.score}%</p>
                    <p className="text-xs text-white/40">Your Score</p>
                  </div>
                ) : (
                  <Link
                    href="/dashboard/quiz"
                    className="block w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-center font-medium hover:from-purple-500 hover:to-cyan-500 transition"
                  >
                    Start Quiz
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Upcoming Schedule</h2>
        <div className="glass-panel p-4 rounded-xl">
          <div className="flex items-center gap-4 p-3 border-b border-white/10">
            <div className="p-2 rounded bg-purple-500/20">
              <Calendar size={18} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Python Quiz - Variables & Data Types</p>
              <p className="text-white/60 text-sm">Tomorrow, 10:00 AM</p>
            </div>
            <button className="text-sm text-cyan-400 hover:text-cyan-300">Set Reminder</button>
          </div>
          <div className="flex items-center gap-4 p-3">
            <div className="p-2 rounded bg-cyan-500/20">
              <Video size={18} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Live Session: JavaScript Q&A</p>
              <p className="text-white/60 text-sm">Feb 18, 2026, 4:00 PM</p>
            </div>
            <button className="text-sm text-cyan-400 hover:text-cyan-300">Join</button>
          </div>
        </div>
      </div>
    </div>
  );
}
