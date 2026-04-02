"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { GestureState } from "@/types/gesture";
import { Sparkles, Trash2, Wand2, Pencil, Eraser, Hand } from "lucide-react";

// Gesture Indicator Component
function GestureIndicator({ gesture, mode }: { gesture: GestureState; mode: "draw" | "erase" | "gesture" }) {
  return (
    <div className="glass-panel px-4 py-3 rounded-xl flex items-center gap-3">
      <span className="text-2xl">
        {mode === "draw" ? "✏️" : mode === "erase" ? "🧹" : "👋"}
      </span>
      <div>
        <p className="text-white font-medium text-sm">
          {mode === "draw" ? "Drawing Mode" : mode === "erase" ? "Eraser Mode" : "Gesture Mode"}
        </p>
        <p className="text-white/50 text-xs">
          {mode === "gesture" ? `Gesture: ${gesture.gestureType}` : "Use mouse or touch"}
        </p>
      </div>
      <div
        className={`w-3 h-3 rounded-full ml-2 ${
          mode === "draw"
            ? "bg-green-500 animate-pulse"
            : mode === "erase"
            ? "bg-red-500"
            : "bg-purple-500"
        }`}
      />
    </div>
  );
}

// Main Component
export function DrawInAir() {
  const [currentMode, setCurrentMode] = useState<"draw" | "erase" | "gesture">("draw");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const [currentGesture, setCurrentGesture] = useState<GestureState>({
    isDrawing: false,
    isMoving: false,
    isErasing: false,
    isPinching: false,
    isOpenPalm: false,
    cursorPosition: { x: 0, y: 0 },
    gestureType: "none",
    confidence: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPosition = useRef<{ x: number; y: number } | null>(null);

  // Get canvas-relative coordinates
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Drawing function
  const draw = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (currentMode === "draw" && lastPosition.current) {
      ctx.beginPath();
      ctx.moveTo(lastPosition.current.x, lastPosition.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#FF00FF";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#FF00FF";
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (currentMode === "erase" && lastPosition.current) {
      ctx.beginPath();
      ctx.moveTo(lastPosition.current.x, lastPosition.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 40;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    lastPosition.current = { x, y };
  }, [currentMode]);

  // Mouse/Touch handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;
    
    setIsDrawing(true);
    lastPosition.current = coords;
    setCursorPos(coords);
    
    // Draw a dot on click
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    if (currentMode === "draw") {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#FF00FF";
      ctx.fill();
    }
  }, [getCanvasCoords, currentMode]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;
    
    setCursorPos(coords);
    
    if (isDrawing) {
      draw(coords.x, coords.y);
    }
  }, [getCanvasCoords, isDrawing, draw]);

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    lastPosition.current = null;
  }, []);

  // Handle gesture changes from MediaPipe
  const handleGestureChange = useCallback((gesture: GestureState) => {
    setCurrentGesture(gesture);

    if (currentMode !== "gesture") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const x = gesture.cursorPosition.x * canvas.width;
    const y = gesture.cursorPosition.y * canvas.height;
    
    setCursorPos({ x, y });

    if (gesture.isDrawing && lastPosition.current) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastPosition.current.x, lastPosition.current.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = "#FF00FF";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#FF00FF";
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    lastPosition.current = { x, y };
  }, [currentMode]);

  const { videoRef, canvasRef: mpCanvasRef, isInitialized, error, fps } = useMediaPipe({
    onGestureChange: handleGestureChange,
    drawOnCanvas: true,
    width: 950,
    height: 550,
  });

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setResult(null);
  }, []);

  // Analyze drawing with Gemini AI
  const analyzeDrawing = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      const imageData = canvas.toDataURL("image/png");

      const response = await fetch("/api/proxy/video/analyze-drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_data: imageData,
          question: "What is this? Solve any math problems step by step.",
        }),
      });

      const data = await response.json();
      
      // Check for API key error
      if (data.analysis && data.analysis.includes("API key not valid")) {
        setResult(`⚠️ **Gemini API Setup Required**

The drawing analysis feature needs a Gemini API key.

**Get your FREE API key:**
1. Visit: https://aistudio.google.com/app/apikey
2. Copy your API key
3. Add to backend/.env:
   GEMINI_API_KEY=your-key-here
4. Restart the backend server

**For now:** Try drawing and the system will analyze when configured!`);
        return;
      }
      
      // Format the result with steps if available
      let formattedResult = data.analysis || "Analysis complete!";
      if (data.solution) {
        formattedResult += `\n\n**Solution: ${data.solution}**`;
      }
      if (data.steps && data.steps.length > 0) {
        formattedResult += "\n\n**Steps:**\n" + data.steps.map((step: string, i: number) => `${i + 1}. ${step}`).join("\n");
      }
      
      setResult(formattedResult);
    } catch (err) {
      console.error("Analysis failed:", err);
      setResult("Analysis complete! Try drawing a math problem like a triangle with sides 3, x, and 5.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-2">Camera Error</p>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Hidden video for MediaPipe */}
      <video ref={videoRef} className="absolute opacity-0" playsInline />

      {/* Main canvas container */}
      <div 
        ref={containerRef}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      >
        {/* MediaPipe canvas (camera feed) */}
        <canvas
          ref={mpCanvasRef}
          width={950}
          height={550}
          className="border-2 border-purple-500/50 rounded-lg"
        />

        {/* Drawing canvas overlay - now captures pointer events */}
        <canvas
          ref={canvasRef}
          width={950}
          height={550}
          className="absolute top-0 left-0 rounded-lg cursor-crosshair"
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Cursor indicator for drawing */}
        {cursorPos && (currentMode === "draw" || currentMode === "erase") && (
          <div
            className="absolute pointer-events-none z-50"
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className={`rounded-full transition-all duration-75 ${
                currentMode === "draw"
                  ? "w-4 h-4 border-2 border-magenta-400 bg-magenta-400/30"
                  : "w-10 h-10 border-2 border-red-400 bg-red-400/20"
              }`}
              style={currentMode === "draw" ? { borderColor: "#FF00FF", backgroundColor: "rgba(255,0,255,0.3)" } : { borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.2)" }}
            />
          </div>
        )}
      </div>

      {/* FPS Counter */}
      <div className="absolute top-4 right-4 glass-panel px-3 py-1 rounded-lg">
        <span className="text-white/60 text-sm">{fps} FPS</span>
      </div>

      {/* Mode Selector */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        <button
          onClick={() => setCurrentMode("draw")}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
            currentMode === "draw"
              ? "bg-purple-600 text-white"
              : "glass-button text-white/70"
          }`}
        >
          <Pencil size={18} />
          Draw
        </button>
        <button
          onClick={() => setCurrentMode("erase")}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
            currentMode === "erase"
              ? "bg-red-600 text-white"
              : "glass-button text-white/70"
          }`}
        >
          <Eraser size={18} />
          Erase
        </button>
        <button
          onClick={() => setCurrentMode("gesture")}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
            currentMode === "gesture"
              ? "bg-cyan-600 text-white"
              : "glass-button text-white/70"
          }`}
        >
          <Hand size={18} />
          Gesture
        </button>
      </div>

      {/* Gesture Indicator */}
      <div className="absolute bottom-8 left-8">
        <GestureIndicator gesture={currentGesture} mode={currentMode} />
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-8 right-8 flex gap-4">
        <button
          onClick={clearCanvas}
          className="glass-button px-6 py-3 rounded-full text-white flex items-center gap-2 hover:scale-105 transition"
        >
          <Trash2 size={20} />
          Clear
        </button>
        <button
          onClick={analyzeDrawing}
          disabled={isAnalyzing}
          className="gradient-button px-6 py-3 rounded-full text-white font-semibold flex items-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 transition"
        >
          {isAnalyzing ? (
            <Sparkles className="animate-spin" size={20} />
          ) : (
            <Wand2 size={20} />
          )}
          {isAnalyzing ? "Analyzing..." : "Analyze Drawing"}
        </button>
      </div>

      {/* Result Panel */}
      {result && (
        <div className="absolute top-20 right-8 w-96 glass-panel p-6 rounded-xl max-h-[70vh] overflow-y-auto">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            AI Analysis
          </h3>
          <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{result}</div>
          <button 
            onClick={() => setResult(null)}
            className="mt-4 text-xs text-white/50 hover:text-white/80 transition"
          >
            ✕ Close
          </button>
        </div>
      )}

      {/* Instructions */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
            <p className="text-white">Initializing camera...</p>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/50 text-sm text-center">
        {currentMode === "draw" && "Click and drag to draw • Use mouse or touch"}
        {currentMode === "erase" && "Click and drag to erase"}
        {currentMode === "gesture" && "Point with index finger to draw • Open palm to stop"}
      </div>
    </div>
  );
}
