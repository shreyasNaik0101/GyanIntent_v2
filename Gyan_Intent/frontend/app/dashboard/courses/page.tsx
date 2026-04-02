"use client";

import { motion } from "framer-motion";
import { BookOpen, Clock, Users, ExternalLink, Check, GraduationCap, RefreshCw, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useGoogleClassroom } from "@/hooks/useGoogleClassroom";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface SubmissionSummary {
  assignment_id: string;
  assignment_title: string;
  state: string;
  late: boolean;
  assigned_grade: number | null;
  max_points: number | null;
}

interface Course {
  id: string;
  name: string;
  teacher: string;
  subject: string;
  description: string;
  progress: number;
  totalAssignments: number;
  submittedAssignments: number;
  gradedAssignments: number;
  color: string;
  lastActivity: string;
  alternateLink?: string;
  submissions: SubmissionSummary[];
}

const COLORS = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-amber-500",
  "from-red-500 to-rose-500",
  "from-indigo-500 to-violet-500",
];

export default function CoursesPage() {
  const [classroomCourses, setClassroomCourses] = useState<Course[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  
  const { 
    isConnected, 
    isLoading: isConnecting,
    user,
    connect, 
    disconnect, 
  } = useGoogleClassroom();

  useEffect(() => {
    if (isConnected) {
      loadClassroomCourses();
    }
  }, [isConnected]);

  const loadClassroomCourses = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/classroom/courses/progress`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const mapped: Course[] = data.map((c: any, i: number) => ({
        id: c.id,
        name: c.name,
        teacher: c.section || "Teacher",
        subject: c.room || "General",
        description: c.description || `${c.name} - Google Classroom`,
        progress: c.completion_rate,
        totalAssignments: c.total_assignments,
        submittedAssignments: c.submitted_assignments,
        gradedAssignments: c.graded_assignments,
        color: COLORS[i % COLORS.length],
        lastActivity: "Just synced",
        alternateLink: c.alternate_link,
        submissions: c.submissions || [],
      }));
      setClassroomCourses(mapped);
    } catch {
      // fallback — at least show course names
    }
    setIsSyncing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">My Courses</h2>
          <p className="text-white/60">
            {isConnected
              ? `${classroomCourses.length} Google Classroom courses synced`
              : "Connect Google Classroom to sync your real courses and use them for quiz generation."}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={async () => {
              if (isConnected) {
                try { await disconnect(); } catch (e) { console.error(e); }
              } else {
                try { await connect(); } catch (e) { console.error(e); }
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              isConnected
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
            }`}
          >
            <BookOpen size={16} />
            {isConnected ? "Google Classroom Connected" : "Connect Google Classroom"}
            {isConnected && <Check size={14} />}
          </button>

          {isConnected && (
            <button
              onClick={loadClassroomCourses}
              className="px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-2 bg-white/5 text-white/70 hover:bg-white/10"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              Sync Courses
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5 border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-cyan-500/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Google Classroom is now the source of truth</h3>
            <p className="text-sm text-white/60">
              We have removed demo Edu and YouTube course mixing from this page. Synced Classroom courses will be used for assignments,
              quiz generation, and follow-up learning workflows.
            </p>
            {isConnected && user?.email && (
              <p className="text-xs text-green-400 mt-2">
                Connected as {user.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="glass-panel rounded-2xl p-8 text-center border border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={28} className="text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Connect Google Classroom</h3>
          <p className="text-white/60 max-w-xl mx-auto mb-5">
            Sync your courses directly from Classroom. Once connected, this page will only show real Classroom courses and use them for quiz and assignment flows.
          </p>
          <button
            onClick={async () => {
              try { await connect(); } catch (e) { console.error(e); }
            }}
            className="px-5 py-2.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition"
          >
            {isConnecting ? "Connecting..." : "Connect Classroom"}
          </button>
        </div>
      )}

      {isConnected && classroomCourses.length === 0 && !isSyncing && (
        <div className="glass-panel rounded-2xl p-8 text-center border border-white/10">
          <h3 className="text-xl font-semibold mb-2">No Classroom courses found</h3>
          <p className="text-white/60">
            Your account is connected, but no Google Classroom courses were returned yet. Try syncing again or confirm the selected Google account has enrolled classes.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classroomCourses.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel rounded-2xl overflow-hidden hover:border-purple-500/50 transition cursor-pointer group"
          >
            <div className={`h-32 bg-gradient-to-br ${course.color} flex items-center justify-center relative overflow-hidden`}>
              <BookOpen size={48} className="text-white/80" />
              <div className="absolute top-3 right-3 px-2 py-1 bg-black/30 backdrop-blur-sm rounded-lg text-xs">
                {course.lastActivity}
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-semibold mb-1 group-hover:text-purple-400 transition">{course.name}</h3>
              <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-blue-400" />
                  {course.teacher}
                </span>
              </div>
              <p className="text-white/60 text-sm mb-4 line-clamp-2">{course.description}</p>
              
              <div className="space-y-3">
                {/* Assignment progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">Assignments</span>
                    <span className="font-semibold">{course.submittedAssignments}/{course.totalAssignments} submitted</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${course.color} transition-all duration-500`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>{course.gradedAssignments} graded</span>
                    <span>{course.progress}% complete</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-white/60 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <BookOpen size={14} />
                    {course.totalAssignments} assignments
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle size={14} className="text-green-400" />
                    {course.submittedAssignments} done
                  </div>
                </div>

                {/* Expandable submission details */}
                {course.submissions.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedCourse(expandedCourse === course.id ? null : course.id); }}
                    className="w-full text-left text-xs text-white/50 hover:text-white/80 transition py-1"
                  >
                    {expandedCourse === course.id ? "▾ Hide details" : `▸ View ${course.submissions.length} submissions`}
                  </button>
                )}
                {expandedCourse === course.id && course.submissions.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {course.submissions.map((sub) => (
                      <div key={sub.assignment_id} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2">
                        <span className="text-white/70 truncate mr-2">{sub.assignment_title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {sub.assigned_grade !== null && sub.max_points ? (
                            <span className="text-cyan-400 font-medium">{sub.assigned_grade}/{sub.max_points}</span>
                          ) : null}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            sub.state === "TURNED_IN" ? "bg-green-500/20 text-green-400" :
                            sub.state === "RETURNED" ? "bg-cyan-500/20 text-cyan-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {sub.state === "TURNED_IN" ? "Submitted" : sub.state === "RETURNED" ? "Graded" : "Pending"}
                          </span>
                          {sub.late && (
                            <span title="Late">
                              <AlertCircle size={12} className="text-red-400" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {course.alternateLink && (
                  <a
                    href={course.alternateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition text-sm font-medium"
                  >
                    <BookOpen size={16} />
                    Open in Classroom
                    <ExternalLink size={14} />
                  </a>
                )}
                <div className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/50 border border-white/5">
                  Quiz generation and assignment workflows will use this synced course as the source.
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
