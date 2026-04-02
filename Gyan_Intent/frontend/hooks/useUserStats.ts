"use client";

import { useState, useEffect, useCallback } from "react";

interface UserStats {
  points: number;
  streak: number;
  xp: number;
  lastActiveDate: string;
  quizzesCompleted: number;
  videosWatched: number;
  lessonsCompleted: number;
}

const STORAGE_KEY = "gyan_user_stats";
const SYNC_EVENT = "gyan_stats_sync";

const DEFAULT_STATS: UserStats = {
  points: 0,
  streak: 0,
  xp: 0,
  lastActiveDate: "",
  quizzesCompleted: 0,
  videosWatched: 0,
  lessonsCompleted: 0,
};

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function readStats(): UserStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
}

function writeStats(s: UserStats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  // Dispatch custom event so all hook instances sync
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);

  // Load from localStorage on mount + handle streak
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: UserStats = JSON.parse(stored);
        const today = getTodayStr();
        const yesterday = getYesterdayStr();

        if (parsed.lastActiveDate === today) {
          setStats(parsed);
        } else if (parsed.lastActiveDate === yesterday) {
          const updated = { ...parsed, streak: parsed.streak + 1, lastActiveDate: today, points: parsed.points + 10 };
          setStats(updated);
          writeStats(updated);
        } else if (parsed.lastActiveDate) {
          const updated = { ...parsed, streak: 1, lastActiveDate: today, points: parsed.points + 10 };
          setStats(updated);
          writeStats(updated);
        } else {
          const updated = { ...DEFAULT_STATS, streak: 1, lastActiveDate: today, points: 10 };
          setStats(updated);
          writeStats(updated);
        }
      } else {
        const initial = { ...DEFAULT_STATS, streak: 1, lastActiveDate: getTodayStr(), points: 10 };
        setStats(initial);
        writeStats(initial);
      }
    } catch {}
  }, []);

  // Listen for sync events from other hook instances
  useEffect(() => {
    const onSync = () => setStats(readStats());
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const addPoints = useCallback((amount: number) => {
    const current = readStats();
    const updated = { ...current, points: current.points + amount, xp: current.xp + amount };
    writeStats(updated);
    setStats(updated);
  }, []);

  const recordQuiz = useCallback(() => {
    const current = readStats();
    const updated = {
      ...current,
      quizzesCompleted: current.quizzesCompleted + 1,
      points: current.points + 50,
      xp: current.xp + 50,
    };
    writeStats(updated);
    setStats(updated);
  }, []);

  const recordVideo = useCallback(() => {
    const current = readStats();
    const updated = {
      ...current,
      videosWatched: current.videosWatched + 1,
      points: current.points + 20,
      xp: current.xp + 20,
    };
    writeStats(updated);
    setStats(updated);
  }, []);

  const recordLesson = useCallback(() => {
    const current = readStats();
    const updated = {
      ...current,
      lessonsCompleted: current.lessonsCompleted + 1,
      points: current.points + 30,
      xp: current.xp + 30,
    };
    writeStats(updated);
    setStats(updated);
  }, []);

  return { stats, addPoints, recordQuiz, recordVideo, recordLesson };
}
