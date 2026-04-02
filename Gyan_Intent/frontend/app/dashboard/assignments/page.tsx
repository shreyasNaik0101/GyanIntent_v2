"use client";

import { motion } from "framer-motion";
import { FileText, Calendar, Clock, CheckCircle, AlertCircle, Trophy, User, ExternalLink, GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useGoogleClassroom } from "@/hooks/useGoogleClassroom";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Assignment {
  id: string;
  title: string;
  course_name: string;
  description?: string;
  dueDate: string;
  status: "pending" | "submitted" | "graded" | "late";
  points: number;
  earnedPoints?: number;
  type: string;
  submittedAt?: string;
  alternateLink?: string;
  late?: boolean;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "graded">("all");
  const [loading, setLoading] = useState(false);

  const { isConnected, isLoading: isConnecting, connect } = useGoogleClassroom();

  useEffect(() => {
    if (isConnected) loadEnrichedAssignments();
  }, [isConnected]);

  const loadEnrichedAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/classroom/assignments/enriched`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const mapped: Assignment[] = data.map((a: any) => ({
        id: a.id,
        title: a.title || "Untitled",
        course_name: a.course_name || "Unknown Course",
        description: a.description,
        dueDate: a.due_date
          ? `${a.due_date.year}-${String(a.due_date.month).padStart(2, "0")}-${String(a.due_date.day).padStart(2, "0")}`
          : "No due date",
        status: a.status,
        points: a.max_points || 0,
        earnedPoints: a.assigned_grade,
        type: a.work_type || "assignment",
        alternateLink: a.alternate_link,
        submittedAt: a.submitted_at,
        late: a.late,
      }));
      setAssignments(mapped);
    } catch (e) {
      console.error("Failed to load assignments:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = filter === "all" ? assignments : assignments.filter((a) => a.status === filter);
  const pendingCount = assignments.filter((a) => a.status === "pending").length;
  const submittedCount = assignments.filter((a) => a.status === "submitted").length;
  const gradedCount = assignments.filter((a) => a.status === "graded").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">My Assignments</h2>
          <p className="text-white/60">
            {isConnected
              ? `${assignments.length} assignments • ${pendingCount} pending • ${submittedCount} submitted • ${gradedCount} graded`
              : "Connect Google Classroom to see your real assignments"}
          </p>
        </div>

        {!isConnected && (
          <button
            onClick={async () => { try { await connect(); } catch (e) { console.error(e); } }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
          >
            <BookOpen size={16} />
            {isConnecting ? "Connecting..." : "Connect Google Classroom"}
          </button>
        )}

        {isConnected && (
          <div className="flex items-center gap-2">
            <button onClick={loadEnrichedAssignments} disabled={loading} className="px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-2 bg-white/5 text-white/70 hover:bg-white/10">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} className="text-green-400" />}
              {loading ? "Syncing..." : "Synced"}
            </button>
          </div>
        )}
      </div>

      {/* Status filter tabs */}
      {isConnected && assignments.length > 0 && (
        <div className="flex gap-2">
          {([
            { key: "all", label: "All", count: assignments.length },
            { key: "pending", label: "Pending", count: pendingCount },
            { key: "submitted", label: "Submitted", count: submittedCount },
            { key: "graded", label: "Graded", count: gradedCount },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === tab.key ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {!isConnected && (
        <div className="glass-panel rounded-2xl p-8 text-center border border-white/10">
          <GraduationCap size={40} className="mx-auto mb-4 text-blue-400" />
          <h3 className="text-xl font-semibold mb-2">Connect Google Classroom</h3>
          <p className="text-white/60 max-w-xl mx-auto">
            Connect your Google Classroom account to see real assignments with actual submission status.
          </p>
        </div>
      )}

      {isConnected && loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="text-purple-400 animate-spin" />
          <span className="ml-3 text-white/60">Loading assignments from Google Classroom...</span>
        </div>
      )}

      {isConnected && !loading && assignments.length === 0 && (
        <div className="glass-panel rounded-2xl p-8 text-center border border-white/10">
          <h3 className="text-xl font-semibold mb-2">No assignments found</h3>
          <p className="text-white/60">Your Google Classroom courses don&apos;t have any assignments yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredAssignments.map((assignment, i) => {
          const statusConfig = {
            pending: { bg: "bg-orange-500/20", text: "text-orange-400", icon: AlertCircle, label: "Pending" },
            submitted: { bg: "bg-blue-500/20", text: "text-blue-400", icon: Clock, label: "Submitted" },
            graded: { bg: "bg-green-500/20", text: "text-green-400", icon: Trophy, label: "Graded" },
            late: { bg: "bg-red-500/20", text: "text-red-400", icon: AlertCircle, label: "Late" },
          }[assignment.status];
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel p-5 rounded-xl hover:border-purple-500/50 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${statusConfig.bg}`}>
                    <FileText size={24} className={statusConfig.text} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold">{assignment.title}</h3>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        <span className="flex items-center gap-1">
                          <StatusIcon size={12} />
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-white/60 text-sm mb-2">{assignment.course_name}</p>
                    <div className="flex items-center gap-4 text-sm text-white/60 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        Due: {assignment.dueDate}
                      </div>
                      {assignment.status === "graded" && assignment.earnedPoints != null ? (
                        <div className="flex items-center gap-1">
                          <Trophy size={14} className="text-amber-400" />
                          <span className="text-amber-400 font-semibold">{assignment.earnedPoints}/{assignment.points}</span>
                        </div>
                      ) : assignment.points > 0 ? (
                        <div className="flex items-center gap-1">
                          <Trophy size={14} />
                          {assignment.points} points
                        </div>
                      ) : null}
                      {assignment.late && (
                        <span className="text-red-400 text-xs font-medium">Late</span>
                      )}
                      {assignment.alternateLink && (
                        <a
                          href={assignment.alternateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                        >
                          <ExternalLink size={14} />
                          Open
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
