"use client";

import { useState, useRef } from "react";
import { Eraser, Send, Loader2, Pencil } from "lucide-react";

interface AirCanvasProps {
  onSolve: (imageDataUrl: string) => void;
  isSolving?: boolean;
}

const COLORS = ["#00ff88", "#ff4488", "#44aaff", "#ffaa00", "#aa44ff", "#ffffff"];
const W = 640, H = 480;

export default function AirCanvas({ onSolve, isSolving = false }: AirCanvasProps) {
  const [strokeColor, setStrokeColor] = useState("#00ff88");
  const [strokeWidth, setStrokeWidth] = useState(4);

  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const mouseDown = useRef(false);
  const lastMouse = useRef<{ x: number; y: number } | null>(null);

  const clearCanvas = () => {
    const c = drawCanvasRef.current;
    if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
  };

  const sendToSolve = () => {
    const c = drawCanvasRef.current;
    if (!c) return;
    const tmp = document.createElement("canvas");
    tmp.width = c.width; tmp.height = c.height;
    const ctx = tmp.getContext("2d")!;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(c, 0, 0);
    onSolve(tmp.toDataURL("image/png"));
  };

  const getCanvasXY = (e: React.MouseEvent | React.TouchEvent) => {
    const c = drawCanvasRef.current;
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const scaleX = c.width / r.width;
    const scaleY = c.height / r.height;
    let cx: number, cy: number;
    if ("touches" in e) {
      cx = (e.touches[0].clientX - r.left) * scaleX;
      cy = (e.touches[0].clientY - r.top) * scaleY;
    } else {
      cx = (e.clientX - r.left) * scaleX;
      cy = (e.clientY - r.top) * scaleY;
    }
    return { x: cx, y: cy };
  };

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    mouseDown.current = true;
    const pt = getCanvasXY(e);
    if (pt) {
      lastMouse.current = pt;
      const c = drawCanvasRef.current;
      if (c) {
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.fillStyle = strokeColor;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, strokeWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!mouseDown.current) return;
    const pt = getCanvasXY(e);
    if (pt && lastMouse.current) {
      drawLine(lastMouse.current, pt);
      lastMouse.current = pt;
    }
  };

  const onPointerUp = () => {
    mouseDown.current = false;
    lastMouse.current = null;
  };

  // ═══════════════════ RENDER ═══════════════════
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Canvas area */}
      <div className="relative w-full max-w-[640px] aspect-[4/3] rounded-xl overflow-hidden bg-gray-900 border-2 border-white/10 shadow-2xl">
        <canvas
          ref={drawCanvasRef}
          width={W}
          height={H}
          className="w-full h-full cursor-crosshair"
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />
        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 backdrop-blur-md text-xs font-medium flex items-center gap-1.5">
          <Pencil size={12} /> Draw with mouse or touch
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={clearCanvas} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/70 border border-white/10 hover:bg-white/20 transition text-sm">
          <Eraser size={14} /> Clear
        </button>
        <button onClick={sendToSolve} disabled={isSolving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-400 hover:to-emerald-400 transition text-sm disabled:opacity-50 shadow-lg shadow-green-500/20">
          {isSolving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {isSolving ? "Solving..." : "Solve"}
        </button>
      </div>

      {/* Color palette & stroke width */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {COLORS.map(c => (
            <button key={c} onClick={() => setStrokeColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition ${strokeColor === c ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 text-white/50 text-xs">
          <span>Size:</span>
          <input type="range" min={2} max={12} value={strokeWidth} onChange={e => setStrokeWidth(+e.target.value)} className="w-20 accent-purple-500" />
        </div>
      </div>

      <p className="text-[11px] text-white/30 text-center max-w-md">
        Use mouse or touch to sketch on the canvas. Press Solve to send it to AI.
      </p>
    </div>
  );
}
