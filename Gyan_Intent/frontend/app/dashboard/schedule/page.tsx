"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  Trophy,
  BookOpen,
  Target,
  Flame,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Play,
  FileText,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";

const SCHEDULE_KEY = "gyan_schedule_done";

// Demo schedule data
const todaySchedule = [
  { id: "python-func", time: "9:00 AM", title: "Python - Functions & Modules", type: "study", duration: "1h 30m", color: "from-purple-500 to-pink-500" },
  { id: "dsa-linked", time: "10:30 AM", title: "DSA Practice - Linked Lists", type: "practice", duration: "1h", color: "from-blue-500 to-cyan-500" },
  { id: "lunch", time: "12:00 PM", title: "Lunch Break", type: "break", duration: "1h", color: "from-gray-500 to-gray-600" },
  { id: "react-hooks", time: "1:00 PM", title: "React.js - Hooks & State", type: "study", duration: "2h", color: "from-cyan-500 to-blue-500" },
  { id: "js-quiz", time: "3:00 PM", title: "JavaScript Quiz", type: "quiz", duration: "30m", color: "from-amber-500 to-orange-500" },
  { id: "ml-neural", time: "3:30 PM", title: "ML Course - Neural Networks", type: "video", duration: "1h 30m", color: "from-green-500 to-emerald-500" },
  { id: "node-assign", time: "5:00 PM", title: "Node.js Assignment", type: "assignment", duration: "1h", color: "from-red-500 to-pink-500" },
  { id: "revision", time: "6:00 PM", title: "Revision & Notes", type: "revision", duration: "1h", color: "from-indigo-500 to-purple-500" },
];

const weeklyPlan = [
  { day: "Mon", subjects: ["Python", "DSA"], hours: 4, done: true },
  { day: "Tue", subjects: ["React", "JavaScript"], hours: 3.5, done: true },
  { day: "Wed", subjects: ["ML", "Node.js"], hours: 4, done: false },
  { day: "Thu", subjects: ["Python", "React"], hours: 3, done: false },
  { day: "Fri", subjects: ["DSA", "ML"], hours: 4, done: false },
  { day: "Sat", subjects: ["Project Work"], hours: 5, done: false },
  { day: "Sun", subjects: ["Revision"], hours: 2, done: false },
];

const upcomingDeadlines = [
  { title: "Python Variables & Data Types Quiz", course: "Python for Beginners", dueDate: "Feb 18", daysLeft: 2, priority: "high", type: "quiz" },
  { title: "Build a Calculator App", course: "JavaScript Full Course", dueDate: "Feb 20", daysLeft: 4, priority: "medium", type: "assignment" },
  { title: "React Components Practice", course: "React.js Complete Guide", dueDate: "Feb 22", daysLeft: 6, priority: "medium", type: "practice" },
  { title: "Linked List Implementation", course: "Data Structures & Algorithms", dueDate: "Feb 25", daysLeft: 9, priority: "low", type: "assignment" },
  { title: "ML Model Training Exercise", course: "Machine Learning Full Course", dueDate: "Feb 28", daysLeft: 12, priority: "low", type: "project" },
];

const studyStats = [
  { label: "Today", value: "3h 30m", sub: "of 8h goal", percent: 44, color: "text-purple-400" },
  { label: "This Week", value: "14h", sub: "of 25h goal", percent: 56, color: "text-cyan-400" },
  { label: "Streak", value: "7 days", sub: "Personal best!", percent: 100, color: "text-amber-400" },
  { label: "Tasks Done", value: "12/18", sub: "this week", percent: 67, color: "text-green-400" },
];

// Calendar event markers
const calendarEvents: Record<number, { type: string; color: string }[]> = {
  16: [{ type: "today", color: "bg-purple-500" }],
  17: [{ type: "study", color: "bg-blue-400" }],
  18: [{ type: "quiz", color: "bg-amber-400" }, { type: "study", color: "bg-blue-400" }],
  20: [{ type: "assignment", color: "bg-red-400" }],
  22: [{ type: "assignment", color: "bg-red-400" }],
  24: [{ type: "study", color: "bg-blue-400" }],
  25: [{ type: "assignment", color: "bg-red-400" }],
  27: [{ type: "study", color: "bg-blue-400" }],
  28: [{ type: "project", color: "bg-green-400" }],
};

export default function SchedulePage() {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SCHEDULE_KEY);
      if (stored) setCompletedTasks(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const toggleTask = (id: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const typeIcons: Record<string, any> = {
    study: BookOpen,
    practice: Target,
    quiz: Trophy,
    video: Play,
    assignment: FileText,
    revision: CheckCircle,
    break: Clock,
    project: Zap,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Schedule</h2>
          <p className="text-white/60">Your learning roadmap for today and beyond</p>
        </div>
        <div className="flex items-center gap-3">
          {studyStats.map((s, i) => (
            <div key={i} className="glass-panel px-4 py-3 rounded-xl text-center min-w-[100px]">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: Today's Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Flame size={20} className="text-orange-400" />
              Today&apos;s Schedule
            </h3>
            <span className="text-sm text-white/40">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>

          <div className="space-y-1">
            {todaySchedule.map((item, i) => {
              const Icon = typeIcons[item.type] || Clock;
              const isDone = completedTasks.has(item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggleTask(item.id)}
                  className={`flex items-center gap-4 p-3 rounded-xl transition group cursor-pointer select-none ${
                    isDone ? "opacity-60" : "hover:bg-white/5"
                  }`}
                >
                  {/* Time */}
                  <div className="w-20 text-right text-sm text-white/50 font-mono shrink-0">
                    {item.time}
                  </div>

                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-3 h-3 rounded-full transition-colors ${isDone ? "bg-green-400" : `bg-gradient-to-r ${item.color}`} ring-2 ring-black`} />
                    {i < todaySchedule.length - 1 && (
                      <div className={`w-0.5 h-12 transition-colors ${isDone ? "bg-green-400/30" : "bg-white/10"}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 p-3 rounded-xl border transition ${
                    isDone
                      ? "bg-white/5 border-green-500/20"
                      : "glass-panel border-white/10 group-hover:border-purple-500/30"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
                          <Icon size={14} className="text-white" />
                        </div>
                        <div>
                          <p className={`font-medium text-sm transition ${isDone ? "line-through text-white/50" : ""}`}>
                            {item.title}
                          </p>
                          <p className="text-xs text-white/40">{item.duration}</p>
                        </div>
                      </div>
                      {isDone ? (
                        <CheckCircle size={18} className="text-green-400 shrink-0" />
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/50 capitalize shrink-0">{item.type}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Weekly Plan */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-blue-400" />
              Weekly Study Plan
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {weeklyPlan.map((day, i) => {
                const isToday = i === new Date().getDay() - 1;
                return (
                  <motion.div
                    key={day.day}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-panel p-3 rounded-xl text-center transition ${
                      isToday ? "border-purple-500/50 bg-purple-500/10" : ""
                    } ${day.done ? "opacity-60" : ""}`}
                  >
                    <p className={`text-xs font-bold mb-2 ${isToday ? "text-purple-400" : "text-white/60"}`}>
                      {day.day}
                    </p>
                    <p className="text-lg font-bold">{day.hours}h</p>
                    <div className="mt-2 space-y-1">
                      {day.subjects.map((s, j) => (
                        <p key={j} className="text-[10px] text-white/40 truncate">{s}</p>
                      ))}
                    </div>
                    {day.done && <CheckCircle size={14} className="text-green-400 mx-auto mt-2" />}
                    {isToday && !day.done && (
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mx-auto mt-2 animate-pulse" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-6">
          {/* Calendar */}
          <div className="glass-panel p-5 rounded-2xl">
            <ScheduleCalendar />
          </div>

          {/* Upcoming Deadlines */}
          <div className="glass-panel p-5 rounded-2xl">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-400" />
              Upcoming Deadlines
            </h3>
            <div className="space-y-3">
              {upcomingDeadlines.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition"
                >
                  <div className={`w-1 h-full min-h-[40px] rounded-full shrink-0 ${
                    d.priority === "high" ? "bg-red-500" : d.priority === "medium" ? "bg-amber-500" : "bg-blue-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-white/40">{d.course}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-white/50">{d.dueDate}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        d.daysLeft <= 3 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/50"
                      }`}>
                        {d.daysLeft}d left
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="glass-panel p-5 rounded-2xl">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap size={18} className="text-yellow-400" />
              Progress Overview
            </h3>
            <div className="space-y-4">
              {studyStats.map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">{s.label}</span>
                    <span className={`font-semibold ${s.color}`}>{s.value}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.percent}%` }}
                      transition={{ duration: 1, delay: i * 0.2 }}
                      className={`h-full rounded-full bg-gradient-to-r ${
                        i === 0 ? "from-purple-500 to-pink-500" :
                        i === 1 ? "from-cyan-500 to-blue-500" :
                        i === 2 ? "from-amber-500 to-orange-500" :
                        "from-green-500 to-emerald-500"
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-white/30 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const today = new Date();

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`e-${i}`} className="h-9" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
    const events = calendarEvents[day] || [];
    const isSelected = selectedDay === day;

    days.push(
      <button
        key={day}
        onClick={() => setSelectedDay(selectedDay === day ? null : day)}
        className={`h-9 flex flex-col items-center justify-center relative rounded-lg transition text-sm ${
          isToday
            ? "bg-purple-500 text-white font-bold shadow-lg shadow-purple-500/30"
            : isSelected
            ? "bg-white/10 text-white"
            : "text-white/70 hover:bg-white/5"
        }`}
      >
        {day}
        {events.length > 0 && (
          <div className="flex gap-0.5 absolute -bottom-0.5">
            {events.slice(0, 3).map((ev, i) => (
              <span key={i} className={`w-1 h-1 rounded-full ${ev.color}`} />
            ))}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition">
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-sm">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <button onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-white/40 font-medium">
        {dayNames.map((d, i) => <div key={i} className="h-6 flex items-center justify-center">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-white/40 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Today</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Due</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Study</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Project</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Quiz</div>
      </div>
    </div>
  );
}
