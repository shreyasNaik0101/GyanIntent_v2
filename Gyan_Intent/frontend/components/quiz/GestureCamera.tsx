"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Video, Square, AlertCircle } from "lucide-react";

interface GestureCameraProps {
  onGestureDetected: (gesture: string) => void;
  disabled?: boolean;
}

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

function detectGestureFromLandmarks(landmarks: any[]): string | null {
  if (!landmarks || landmarks.length === 0) return null;
  const hand = landmarks[0];

  const thumbTip = hand[4];
  const thumbMCP = hand[2];
  const wrist = hand[0];

  // Finger tips and PIP joints
  const fingerTips = [hand[8], hand[12], hand[16], hand[20]];
  const fingerPIPs = [hand[6], hand[10], hand[14], hand[18]];

  // Count curled fingers (lenient: tip y > pip y means curled on screen)
  let curledCount = 0;
  for (let i = 0; i < 4; i++) {
    if (fingerTips[i].y > fingerPIPs[i].y - 0.02) curledCount++;
  }

  // Need at least 2 fingers curled (very lenient)
  const fingersCurled = curledCount >= 2;

  // Thumb direction relative to MCP
  const thumbUp = thumbTip.y < thumbMCP.y - 0.04;
  const thumbDown = thumbTip.y > thumbMCP.y + 0.04;

  // Thumb must be somewhat extended
  const thumbExtended =
    Math.abs(thumbTip.x - thumbMCP.x) > 0.03 ||
    Math.abs(thumbTip.y - thumbMCP.y) > 0.05;

  if (fingersCurled && thumbUp && thumbExtended) return "thumbs_up";
  if (fingersCurled && thumbDown && thumbExtended) return "thumbs_down";
  return null;
}

export default function GestureCamera({ onGestureDetected, disabled = false }: GestureCameraProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [gesture, setGesture] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [detectionStatus, setDetectionStatus] = useState("Camera off");
  const [isModelLoading, setIsModelLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const gestureHoldRef = useRef<{ gesture: string; startTime: number } | null>(null);
  const cooldownRef = useRef(false);
  const disabledRef = useRef(disabled);
  const onGestureRef = useRef(onGestureDetected);

  const HOLD_MS = 400;
  const COOLDOWN_MS = 1200;

  // Keep refs fresh
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { onGestureRef.current = onGestureDetected; }, [onGestureDetected]);

  // Draw hand landmarks on canvas
  const drawLandmarks = useCallback((landmarks: any[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length === 0) return;
    const lm = landmarks[0];
    const w = canvas.width;
    const h = canvas.height;

    ctx.strokeStyle = "rgba(0,255,128,0.7)";
    ctx.lineWidth = 2;
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(lm[a].x * w, lm[a].y * h);
      ctx.lineTo(lm[b].x * w, lm[b].y * h);
      ctx.stroke();
    }
    for (const pt of lm) {
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255,0,128,0.9)";
      ctx.fill();
    }
  }, []);

  // Handle a detected gesture (or null)
  const handleGestureResult = useCallback((detected: string | null) => {
    if (disabledRef.current || cooldownRef.current) {
      setDetectionStatus(cooldownRef.current ? "Cooldown..." : "Paused");
      return;
    }

    if (detected) {
      setDetectionStatus(detected === "thumbs_up" ? "Thumbs Up detected!" : "Thumbs Down detected!");

      if (!gestureHoldRef.current || gestureHoldRef.current.gesture !== detected) {
        gestureHoldRef.current = { gesture: detected, startTime: Date.now() };
      } else {
        const held = Date.now() - gestureHoldRef.current.startTime;
        setProgress(Math.min(100, (held / HOLD_MS) * 100));

        if (held >= HOLD_MS) {
          setGesture(detected);
          onGestureRef.current(detected);
          gestureHoldRef.current = null;
          cooldownRef.current = true;
          setProgress(100);
          setTimeout(() => {
            setGesture("");
            setProgress(0);
            cooldownRef.current = false;
          }, COOLDOWN_MS);
        }
      }
    } else {
      gestureHoldRef.current = null;
      setProgress(0);
      setDetectionStatus("Show thumbs up or down");
    }
  }, []);

  // Load MediaPipe Hands via CDN script tag (Closure Compiler IIFE registers on window)
  const loadScript = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(s);
    });
  }, []);

  const initMediaPipe = useCallback(async () => {
    if (handsRef.current) return;
    setIsModelLoading(true);
    try {
      const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240";
      await loadScript(`${CDN}/hands.js`);
      const win = window as any;
      if (!win.Hands) throw new Error("Hands not found on window after loading script");
      const hands = new win.Hands({
        locateFile: (file: string) => `${CDN}/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.4,
      });
      hands.onResults((results: any) => {
        const lm = results.multiHandLandmarks;
        drawLandmarks(lm);
        const detected = lm?.length > 0 ? detectGestureFromLandmarks(lm) : null;
        handleGestureResult(detected);
      });
      await hands.initialize();
      handsRef.current = hands;
    } catch (err) {
      console.error("Failed to load MediaPipe Hands:", err);
      setError("Could not load hand detection model.");
    }
    setIsModelLoading(false);
  }, [loadScript, drawLandmarks, handleGestureResult]);

  // Start camera
  const startCamera = async () => {
    setError("");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please allow permissions.");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setGesture("");
    setProgress(0);
    setDetectionStatus("Camera off");
    gestureHoldRef.current = null;
    cooldownRef.current = false;
  };

  // Attach stream + start detection loop
  useEffect(() => {
    if (!isCameraActive || !stream || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play().catch((e) => console.error("Play error:", e));
    };

    let cancelled = false;
    initMediaPipe().then(() => {
      const detect = async () => {
        if (cancelled) return;
        if (videoRef.current && handsRef.current && videoRef.current.readyState >= 2) {
          try { await handsRef.current.send({ image: videoRef.current }); } catch (_) {}
        }
        if (!cancelled) animFrameRef.current = requestAnimationFrame(detect);
      };
      detect();
    });

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [isCameraActive, stream, initMediaPipe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (handsRef.current) { handsRef.current.close(); handsRef.current = null; }
    };
  }, [stream]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[320px] h-[240px] rounded-lg overflow-hidden bg-gray-900 border-2 border-white/20 shadow-xl">
        {isCameraActive ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full transform -scale-x-100 pointer-events-none" />

            <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-[10px] text-white/80 backdrop-blur-sm">
              {isModelLoading ? "Loading model..." : detectionStatus}
            </div>

            {gesture && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="text-white font-bold text-5xl animate-bounce">
                  {gesture === "thumbs_up" ? "👍" : "👎"}
                </div>
              </div>
            )}
            {progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100" style={{ width: `${progress}%` }} />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-white/50 gap-3">
            {error ? (
              <>
                <AlertCircle size={36} className="text-red-400" />
                <p className="text-red-300 px-4 text-center text-xs">{error}</p>
              </>
            ) : (
              <>
                <Camera size={36} />
                <p className="text-sm">Camera is off</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {!isCameraActive ? (
          <button onClick={startCamera} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition font-medium text-sm shadow-lg shadow-blue-500/20">
            <Video size={16} /> Start Camera
          </button>
        ) : (
          <button onClick={stopCamera} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition font-medium text-sm">
            <Square size={16} /> Stop Camera
          </button>
        )}
      </div>

      {isCameraActive && (
        <p className="text-[10px] text-white/40 text-center max-w-[280px]">
          Hold a thumbs-up for True or thumbs-down for False
        </p>
      )}
    </div>
  );
}