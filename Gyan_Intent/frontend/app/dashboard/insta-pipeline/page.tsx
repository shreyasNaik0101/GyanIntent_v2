"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Eye,
  Heart,
  Loader2,
  Pause,
  Play,
  Sparkles,
  ThumbsDown,
  Volume2,
  VolumeX,
} from "lucide-react";

import { useUserStats } from "@/hooks/useUserStats";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const VIEWER_ID_KEY = "gyan_insta_pipeline_viewer";

type ReactionType = "like" | "dislike" | "clear";

type FeedItem = {
  id: string;
  source: "builtin" | "cache-index" | "generated";
  title: string;
  description: string;
  subject: string;
  language: string;
  duration_seconds?: number | null;
  video_url: string;
  subtitles_url?: string | null;
  likes: number;
  dislikes: number;
  views: number;
  score: number;
  viewer_reaction?: "like" | "dislike" | null;
};

type FeedReactionSummary = {
  video_id: string;
  likes: number;
  dislikes: number;
  views: number;
  score: number;
  viewer_reaction?: "like" | "dislike" | null;
};

type LanguageFilter = "all" | "english" | "hindi" | "kannada";

function getOrCreateViewerId() {
  const existing = window.localStorage.getItem(VIEWER_ID_KEY);
  if (existing) {
    return existing;
  }

  const generated = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `viewer-${Date.now()}`;
  window.localStorage.setItem(VIEWER_ID_KEY, generated);
  return generated;
}

function toPlaybackUrl(videoUrl: string) {
  if (videoUrl.startsWith("/videos/")) {
    return videoUrl;
  }

  return videoUrl.replace(/^https?:\/\/[^/]+\/media\//, "/api/video-proxy/");
}

function formatDuration(durationSeconds?: number | null) {
  if (!durationSeconds) {
    return "Short";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function FeedVideoCard({
  item,
  active,
  isPaused,
  isMuted,
  onVisible,
  onReact,
  onRecordView,
  onTogglePlayback,
  onToggleMute,
  reactionPending,
}: {
  item: FeedItem;
  active: boolean;
  isPaused: boolean;
  isMuted: boolean;
  onVisible: (videoId: string) => void;
  onReact: (videoId: string, reaction: ReactionType) => void;
  onRecordView: (videoId: string) => void;
  onTogglePlayback: (videoId: string) => void;
  onToggleMute: () => void;
  reactionPending: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recordedRef = useRef(false);

  const handlePlaybackToggle = () => {
    const video = videoRef.current;
    if (!video) {
      onTogglePlayback(item.id);
      return;
    }

    if (active && !isPaused) {
      video.pause();
      onTogglePlayback(item.id);
      return;
    }

    onTogglePlayback(item.id);
    void video.play().catch(() => undefined);
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onVisible(item.id);
        }
      },
      { threshold: 0.65 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [item.id, onVisible]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (active && !isPaused) {
      void video.play().catch(() => undefined);
      if (!recordedRef.current) {
        const timeout = window.setTimeout(() => {
          recordedRef.current = true;
          onRecordView(item.id);
        }, 1500);
        return () => window.clearTimeout(timeout);
      }
      return;
    }

    video.pause();
  }, [active, isPaused, item.id, onRecordView]);

  return (
    <section className="snap-start h-[calc(100vh-5rem)] py-4">
      <div
        ref={containerRef}
        className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#120f1f] via-[#080a14] to-[#151026] shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={toPlaybackUrl(item.video_url)}
          loop
          muted={isMuted || !active}
          playsInline
          preload="metadata"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/50" />

        <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70 backdrop-blur-md">
          <Sparkles size={14} className="text-fuchsia-300" />
          Insta Pipeline
        </div>

        <div className="absolute right-6 top-6 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-sm text-white/80 backdrop-blur-md">
          {formatDuration(item.duration_seconds)}
        </div>

        <button
          type="button"
          onClick={handlePlaybackToggle}
          className="absolute right-6 top-20 flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-2 text-sm text-white/80 backdrop-blur-md transition hover:border-white/30 hover:bg-black/50"
        >
          {active && !isPaused ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
          {active && !isPaused ? "Pause" : "Play"}
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          className="absolute right-6 top-36 flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-2 text-sm text-white/80 backdrop-blur-md transition hover:border-white/30 hover:bg-black/50"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {isMuted ? "Unmute" : "Mute"}
        </button>

        <div className="absolute bottom-6 left-6 right-24">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
            <BookOpen size={14} />
            {item.subject}
            <span className="text-white/40">•</span>
            <span className="text-white/70">{item.language}</span>
          </div>

          <h2 className="max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
            {item.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
            {item.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/70">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {item.source === "cache-index" ? "Cached series" : item.source === "builtin" ? "Built-in" : "Generated"}
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <Eye size={14} />
              {item.views} views
            </span>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 flex w-16 flex-col items-center gap-3 rounded-[2rem] border border-white/10 bg-black/35 p-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => onReact(item.id, item.viewer_reaction === "like" ? "clear" : "like")}
            disabled={reactionPending}
            className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${
              item.viewer_reaction === "like"
                ? "border-pink-400 bg-pink-500/20 text-pink-300"
                : "border-white/10 bg-white/5 text-white/80 hover:border-pink-400/50 hover:bg-pink-500/10"
            }`}
          >
            {reactionPending ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} />}
          </button>
          <span className="text-xs text-white/70">{item.likes}</span>

          <button
            type="button"
            onClick={() => onReact(item.id, item.viewer_reaction === "dislike" ? "clear" : "dislike")}
            disabled={reactionPending}
            className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${
              item.viewer_reaction === "dislike"
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                : "border-white/10 bg-white/5 text-white/80 hover:border-cyan-400/50 hover:bg-cyan-500/10"
            }`}
          >
            {reactionPending ? <Loader2 size={18} className="animate-spin" /> : <ThumbsDown size={18} />}
          </button>
          <span className="text-xs text-white/70">{item.dislikes}</span>
        </div>

        {(!active || isPaused) && (
          <button
            type="button"
            onClick={handlePlaybackToggle}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-black/45 backdrop-blur-md">
              <Play size={28} className="translate-x-[2px] text-white" fill="currentColor" />
            </div>
          </button>
        )}
      </div>
    </section>
  );
}

export default function InstaPipelinePage() {
  const [viewerId, setViewerId] = useState("");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingReactionId, setPendingReactionId] = useState<string | null>(null);
  const [pausedIds, setPausedIds] = useState<Record<string, boolean>>({});
  const [isMuted, setIsMuted] = useState(true);
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("all");
  const recordedIdsRef = useRef<Set<string>>(new Set());
  const { recordVideo } = useUserStats();

  const languageCounts = {
    english: items.filter((item) => item.language === "english").length,
    hindi: items.filter((item) => item.language === "hindi").length,
    kannada: items.filter((item) => item.language === "kannada").length,
  };

  const availableFilters: Array<{ value: LanguageFilter; label: string; count: number }> = [
    { value: "all", label: "All", count: items.length },
    { value: "english", label: "English", count: languageCounts.english },
    { value: "kannada", label: "Kannada", count: languageCounts.kannada },
    { value: "hindi", label: "Hindi", count: languageCounts.hindi },
  ].filter((filter) => filter.value === "all" || filter.count > 0);

  const visibleItems = items.filter((item) => languageFilter === "all" || item.language === languageFilter);

  useEffect(() => {
    setViewerId(getOrCreateViewerId());
  }, []);

  useEffect(() => {
    if (!viewerId) {
      return;
    }

    const loadFeed = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/video/feed?viewer_id=${encodeURIComponent(viewerId)}`);
        if (!response.ok) {
          throw new Error(`Failed to load feed (${response.status})`);
        }
        const data: FeedItem[] = await response.json();
        setItems(data);
        setActiveId((current) => current ?? data[0]?.id ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load insta pipeline";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadFeed();
  }, [viewerId]);

  useEffect(() => {
    if (languageFilter === "all") {
      return;
    }

    const selectedFilterStillAvailable = availableFilters.some((filter) => filter.value === languageFilter);
    if (!selectedFilterStillAvailable) {
      setLanguageFilter("all");
    }
  }, [availableFilters, languageFilter]);

  useEffect(() => {
    if (!visibleItems.length) {
      return;
    }

    const activeStillVisible = visibleItems.some((item) => item.id === activeId);
    if (!activeStillVisible) {
      setActiveId(visibleItems[0].id);
    }
  }, [activeId, visibleItems]);

  const updateItemSummary = (videoId: string, summary: FeedReactionSummary) => {
    setItems((current) =>
      current.map((item) =>
        item.id === videoId
          ? {
              ...item,
              likes: summary.likes,
              dislikes: summary.dislikes,
              views: summary.views,
              score: summary.score,
              viewer_reaction: summary.viewer_reaction ?? null,
            }
          : item
      )
    );
  };

  const handleTogglePlayback = (videoId: string) => {
    setPausedIds((current) => ({
      ...current,
      [videoId]: !current[videoId],
    }));
    setActiveId(videoId);
  };

  const handleToggleMute = () => {
    setIsMuted((current) => !current);
  };

  const handleReaction = async (videoId: string, reaction: ReactionType) => {
    if (!viewerId) {
      return;
    }

    setPendingReactionId(videoId);
    try {
      const response = await fetch(`${API_BASE}/video/feed/${videoId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewer_id: viewerId, reaction }),
      });
      if (!response.ok) {
        throw new Error(`Failed to save reaction (${response.status})`);
      }
      const summary: FeedReactionSummary = await response.json();
      updateItemSummary(videoId, summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save reaction";
      setError(message);
    } finally {
      setPendingReactionId(null);
    }
  };

  const handleRecordView = async (videoId: string) => {
    if (!viewerId || recordedIdsRef.current.has(videoId)) {
      return;
    }

    recordedIdsRef.current.add(videoId);
    recordVideo();

    try {
      const response = await fetch(`${API_BASE}/video/feed/${videoId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewer_id: viewerId, watch_time_ms: 1500 }),
      });
      if (!response.ok) {
        throw new Error(`Failed to record view (${response.status})`);
      }
      const summary: FeedReactionSummary = await response.json();
      updateItemSummary(videoId, summary);
    } catch {
      // View tracking is non-blocking for playback.
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <div className="glass-panel flex items-center gap-3 px-6 py-4 text-white/80">
          <Loader2 size={18} className="animate-spin text-fuchsia-300" />
          Loading video feed...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <div className="glass-panel max-w-lg p-6 text-center">
          <p className="text-lg font-medium text-white">Insta Pipeline is unavailable</p>
          <p className="mt-2 text-sm text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <div className="glass-panel max-w-lg p-6 text-center">
          <p className="text-lg font-medium text-white">No videos found</p>
          <p className="mt-2 text-sm text-white/60">
            Generate a few videos first, then they will appear in the feed automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-[1.75rem] border border-white/10 bg-gradient-to-r from-fuchsia-500/15 via-rose-500/10 to-cyan-500/15 px-6 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-300">Insta Pipeline</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Swipe through learning videos</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            This feed blends built-in demos and generated explainers into a short-form learning stream.
          </p>
        </div>
        <div className="hidden rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70 md:block">
          {visibleItems.length} ready-to-watch videos
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {availableFilters.map((filter) => {
          const selected = languageFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setLanguageFilter(filter.value)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                selected
                  ? "border-fuchsia-400 bg-fuchsia-500/15 text-white"
                  : "border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:text-white"
              }`}
            >
              {filter.label}
              <span className="ml-2 text-white/45">{filter.count}</span>
            </button>
          );
        })}
      </div>

      {!visibleItems.length ? (
        <div className="glass-panel p-6 text-center">
          <p className="text-lg font-medium text-white">No {languageFilter} videos yet</p>
          <p className="mt-2 text-sm text-white/60">
            Switch to another language filter or generate more videos in this language.
          </p>
        </div>
      ) : null}

      <div className="h-[calc(100vh-15rem)] overflow-y-auto snap-y snap-mandatory pr-2">
        {visibleItems.map((item) => (
          <FeedVideoCard
            key={item.id}
            item={item}
            active={activeId === item.id}
            isPaused={Boolean(pausedIds[item.id])}
            isMuted={isMuted}
            onVisible={setActiveId}
            onReact={handleReaction}
            onRecordView={handleRecordView}
            onTogglePlayback={handleTogglePlayback}
            onToggleMute={handleToggleMute}
            reactionPending={pendingReactionId === item.id}
          />
        ))}
      </div>
    </div>
  );
}