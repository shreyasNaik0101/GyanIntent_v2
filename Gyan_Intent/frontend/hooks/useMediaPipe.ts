"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { GestureState, GestureType, DEFAULT_GESTURE_CONFIG } from "@/types/gesture";

// Global declarations for MediaPipe loaded from CDN
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}

// Types for MediaPipe
interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface MediaPipeResults {
  image: HTMLVideoElement | HTMLImageElement;
  multiHandLandmarks?: HandLandmark[][];
}

interface UseMediaPipeOptions {
  onGestureChange?: (gesture: GestureState) => void;
  onFrame?: (results: MediaPipeResults) => void;
  drawOnCanvas?: boolean;
  width?: number;
  height?: number;
}

// Load script helper
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export function useMediaPipe(options: UseMediaPipeOptions = {}) {
  const {
    onGestureChange,
    onFrame,
    drawOnCanvas = true,
    width = 950,
    height = 550,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const gestureHistory = useRef<GestureType[]>([]);

  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  // Calculate distance between two landmarks
  const getDistance = useCallback((p1: HandLandmark, p2: HandLandmark) => {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }, []);

  // Detect gesture from hand landmarks
  const detectGesture = useCallback((landmarks: HandLandmark[]): GestureState => {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];
    const wrist = landmarks[0];

    const thumbIndexDist = getDistance(thumbTip, indexTip);
    const thumbMiddleDist = getDistance(thumbTip, middleTip);
    const thumbRingDist = getDistance(thumbTip, ringTip);

    // Check if fingers are extended (tip above PIP joint in screen space)
    const indexExtended = indexTip.y < indexPIP.y - 0.02;
    const middleExtended = middleTip.y < middlePIP.y - 0.02;
    const ringExtended = ringTip.y < ringPIP.y - 0.02;
    const pinkyExtended = pinkyTip.y < pinkyPIP.y - 0.02;
    const thumbExtended = thumbTip.x < thumbIP.x - 0.02; // Thumb extends sideways

    // Count extended fingers
    const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    const { drawThreshold, eraseThreshold, pinchThreshold } = DEFAULT_GESTURE_CONFIG;

    let gestureType: GestureType = "none";
    let isDrawing = false;
    let isMoving = false;
    let isErasing = false;
    let isPinching = false;
    let isOpenPalm = false;

    // Pinch: Thumb + Index very close together (for zoom/control)
    if (thumbIndexDist < pinchThreshold) {
      gestureType = "pinch";
      isPinching = true;
    }
    // Drawing: Only index finger extended (like pointing)
    else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      gestureType = "drawing";
      isDrawing = true;
    }
    // Erasing: Thumb + Ring close OR fist (all fingers closed)
    else if (thumbRingDist < eraseThreshold || extendedCount === 0) {
      gestureType = "erasing";
      isErasing = true;
    }
    // Moving: Index + Middle extended together
    else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      gestureType = "moving";
      isMoving = true;
    }
    // Open Palm: All fingers extended
    else if (extendedCount >= 3) {
      gestureType = "open_palm";
      isOpenPalm = true;
    }
    // Default: track if hand is detected
    else {
      gestureType = "none";
    }

    // Smooth gesture detection with history (reduced from 5 to 3 frames for faster response)
    gestureHistory.current.push(gestureType);
    if (gestureHistory.current.length > 3) {
      gestureHistory.current.shift();
    }

    // Require 2/3 frames for gesture consistency
    const gestureCounts = gestureHistory.current.reduce((acc, g) => {
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommon = Object.entries(gestureCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostCommon && mostCommon[1] >= 2) {
      gestureType = mostCommon[0] as GestureType;
    }

    return {
      isDrawing,
      isMoving,
      isErasing,
      isPinching,
      isOpenPalm,
      cursorPosition: { x: indexTip.x, y: indexTip.y },
      gestureType,
      confidence: mostCommon ? mostCommon[1] / 3 : 0,
    };
  }, [getDistance]);

  // Initialize MediaPipe Hands
  useEffect(() => {
    if (typeof window === "undefined" || !videoRef.current) return;

    let hands: any = null;
    let camera: any = null;
    let isMounted = true;

    const initMediaPipe = async () => {
      try {
        // Load MediaPipe scripts from CDN
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");

        if (!isMounted) return;

        // Wait for globals to be available
        await new Promise(resolve => setTimeout(resolve, 100));

        const { Hands, Camera, drawConnectors, drawLandmarks, HAND_CONNECTIONS } = window as any;

        if (!Hands) {
          throw new Error("MediaPipe Hands not loaded");
        }

        hands = new Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        let frameCount = 0;
        let lastTime = performance.now();

        hands.onResults((results: MediaPipeResults) => {
          if (!isMounted) return;

          // Calculate FPS
          frameCount++;
          const now = performance.now();
          if (now - lastTime >= 1000) {
            setFps(frameCount);
            frameCount = 0;
            lastTime = now;
          }

          // Draw on canvas if enabled
          if (drawOnCanvas && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.save();
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

              if (results.multiHandLandmarks && results.multiHandLandmarks[0]) {
                const landmarks = results.multiHandLandmarks[0];
                if (drawConnectors && HAND_CONNECTIONS) {
                  drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                    color: "#00FF00",
                    lineWidth: 2,
                  });
                }
                if (drawLandmarks) {
                  drawLandmarks(ctx, landmarks, {
                    color: "#FF0000",
                    lineWidth: 1,
                    radius: 3,
                  });
                }
              }
              ctx.restore();
            }
          }

          // Process gesture
          if (results.multiHandLandmarks && results.multiHandLandmarks[0]) {
            const gesture = detectGesture(results.multiHandLandmarks[0]);
            onGestureChange?.(gesture);
          }

          onFrame?.(results);
        });

        handsRef.current = hands;

        // Initialize camera
        if (!Camera) {
          throw new Error("MediaPipe Camera not loaded");
        }

        camera = new Camera(videoRef.current!, {
          onFrame: async () => {
            if (hands && videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width,
          height,
        });

        cameraRef.current = camera;

        await camera.start();
        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (err: any) {
        console.error("MediaPipe init error:", err);
        if (isMounted) {
          // Better error message for permission errors
          let errorMessage = "Failed to initialize MediaPipe";
          if (err.name === 'NotAllowedError') {
            errorMessage = "Camera permission denied. Please allow camera access and reload the page.";
          } else if (err.name === 'NotFoundError') {
            errorMessage = "No camera found. Please connect a camera and try again.";
          } else if (err.name === 'NotReadableError') {
            errorMessage = "Camera is already in use by another application.";
          } else if (err.message) {
            errorMessage = err.message;
          }
          setError(errorMessage);
        }
      }
    };

    initMediaPipe();

    return () => {
      isMounted = false;
      if (camera) {
        try { camera.stop(); } catch (e) { /* ignore */ }
      }
      if (hands) {
        try { hands.close(); } catch (e) { /* ignore */ }
      }
    };
  }, [width, height, drawOnCanvas, detectGesture, onGestureChange, onFrame]);

  return {
    videoRef,
    canvasRef,
    isInitialized,
    error,
    fps,
  };
}
