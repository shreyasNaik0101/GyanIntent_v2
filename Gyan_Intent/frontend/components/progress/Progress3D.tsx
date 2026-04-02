"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── helpers ─────────────────────────────────────────────────────────── */

function SpinBox({ color, pos }: { color: string; pos: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, d) => { ref.current.rotation.y += d; });
  return (
    <mesh ref={ref} position={pos}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/* ── WeeklyChart3D ───────────────────────────────────────────────────── */

function Bar({ h, x, color, delay }: { h: number; x: number; color: string; delay: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const s = useRef(0.01);
  useFrame((_, d) => {
    s.current = THREE.MathUtils.lerp(s.current, 1, d * (2 - delay * 0.1));
    ref.current.scale.y = s.current;
    ref.current.position.y = (h * s.current) / 2;
  });
  return (
    <mesh ref={ref} position={[x, 0, 0]}>
      <boxGeometry args={[0.5, h, 0.5]} />
      <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
    </mesh>
  );
}

export function WeeklyChart3D() {
  const vals = [65, 80, 45, 90, 70, 55, 85];
  const cols = ["#a855f7", "#ec4899", "#6366f1", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const mh = 3;

  return (
    <div className="w-full h-[300px] rounded-2xl overflow-hidden" style={{ background: "linear-gradient(180deg,#0a0a1a,#050510)" }}>
      <Canvas camera={{ position: [0, 3, 7], fov: 35 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} />
        <pointLight position={[-3, 4, 2]} intensity={1} color="#a855f7" />
        <pointLight position={[3, 4, 2]} intensity={1} color="#ec4899" />
        <group position={[-2.7, -1, 0]}>
          {vals.map((v, i) => (
            <Bar key={i} h={(v / 100) * mh} x={i * 0.9} color={cols[i]} delay={i} />
          ))}
        </group>
      </Canvas>
      {/* HTML overlay labels */}
      <div className="flex justify-around px-8 -mt-8 relative z-10">
        {days.map((d, i) => (
          <div key={d} className="text-center">
            <p className="text-white text-xs font-bold">{vals[i]}%</p>
            <p className="text-white/50 text-[10px]">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── SubjectProgress3D ───────────────────────────────────────────────── */

function Ring({ progress, color, radius, x }: { progress: number; color: string; radius: number; x: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const arc = useRef(0.01);
  useFrame((state, d) => {
    arc.current = THREE.MathUtils.lerp(arc.current, (progress / 100) * Math.PI * 2, d * 1.5);
    const g = new THREE.TorusGeometry(radius, 0.1, 16, 64, Math.max(0.02, arc.current));
    ref.current.geometry.dispose();
    ref.current.geometry = g;
    ref.current.rotation.x = Math.PI / 2;
    ref.current.position.x = x;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5 + x) * 0.08;
  });
  return (
    <>
      {/* bg ring */}
      <mesh position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.04, 16, 64]} />
        <meshStandardMaterial color="#333" transparent opacity={0.4} />
      </mesh>
      {/* progress arc */}
      <mesh ref={ref}>
        <torusGeometry args={[radius, 0.1, 16, 64, 0.02]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* center dot */}
      <mesh position={[x, 0, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </>
  );
}

export function SubjectProgress3D({ subjects }: { subjects: { name: string; progress: number; color: string }[] }) {
  const cmap: Record<string, string> = {
    "from-purple-500 to-pink-500": "#a855f7",
    "from-blue-500 to-cyan-500": "#3b82f6",
    "from-green-500 to-emerald-500": "#22c55e",
    "from-orange-500 to-amber-500": "#f59e0b",
  };
  const sp = 2.5;
  const off = ((subjects.length - 1) * sp) / 2;

  return (
    <div className="w-full h-[260px] rounded-2xl overflow-hidden" style={{ background: "linear-gradient(180deg,#0a0a1a,#050510)" }}>
      <Canvas camera={{ position: [0, 0.5, 6], fov: 42 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 5]} intensity={1} />
        <pointLight position={[-3, 3, 2]} intensity={0.7} color="#a855f7" />
        <pointLight position={[3, 3, 2]} intensity={0.7} color="#ec4899" />
        {subjects.map((s, i) => (
          <Ring key={s.name} progress={s.progress} color={cmap[s.color] || "#a855f7"} radius={0.8} x={i * sp - off} />
        ))}
      </Canvas>
      {/* HTML overlay labels */}
      <div className="flex justify-around px-12 -mt-10 relative z-10">
        {subjects.map(s => (
          <div key={s.name} className="text-center">
            <p className="text-white text-sm font-bold">{s.progress}%</p>
            <p className="text-white/50 text-[10px]">{s.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Achievements3D ──────────────────────────────────────────────────── */

function Gem({ pos, color, size }: { pos: [number, number, number]; color: string; size: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.8;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    ref.current.position.y = pos[1] + Math.sin(state.clock.elapsedTime * 1.2 + pos[0] * 2) * 0.2;
  });
  return (
    <mesh ref={ref} position={pos}>
      <octahedronGeometry args={[size, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

function Flame({ pos }: { pos: [number, number, number] }) {
  const o = useRef<THREE.Mesh>(null!);
  const n = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    o.current.scale.y = 1 + Math.sin(t * 3) * 0.25;
    o.current.scale.x = 1 + Math.sin(t * 2.5 + 1) * 0.15;
    n.current.scale.y = 1 + Math.sin(t * 4) * 0.2;
    n.current.scale.x = 1 + Math.cos(t * 3) * 0.1;
  });
  return (
    <group position={pos}>
      <mesh ref={o}>
        <coneGeometry args={[0.3, 0.9, 8]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.7} transparent opacity={0.9} />
      </mesh>
      <mesh ref={n} position={[0, 0.05, 0]} scale={0.65}>
        <coneGeometry args={[0.22, 0.6, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

const achData = [
  { label: "🔥 7-Day Streak", x: -2.5, color: "#f97316" },
  { label: "📚 Course Master", x: -0.8, color: "#3b82f6" },
  { label: "🎯 Quiz Champ", x: 0.8, color: "#a855f7" },
  { label: "⭐ Top Learner", x: 2.5, color: "#fbbf24" },
];

export function Achievements3D() {
  return (
    <div className="w-full h-[300px] rounded-2xl overflow-hidden" style={{ background: "linear-gradient(180deg,#0a0a1a,#050510)" }}>
      <Canvas camera={{ position: [0, 0.8, 5], fov: 40 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 3]} intensity={1} />
        <pointLight position={[-2, 3, 2]} intensity={0.8} color="#f59e0b" />
        <pointLight position={[2, 3, -1]} intensity={0.6} color="#a855f7" />

        <Flame pos={[-2.5, 0, 0]} />
        <Gem pos={[-0.8, 0.3, 0]} color="#3b82f6" size={0.3} />
        <Gem pos={[0.8, 0.3, 0]} color="#a855f7" size={0.3} />
        <Gem pos={[2.5, 0.3, 0]} color="#fbbf24" size={0.3} />
      </Canvas>
      {/* HTML overlay labels */}
      <div className="flex justify-around px-6 -mt-10 relative z-10">
        {achData.map(a => (
          <p key={a.label} className="text-[11px] font-semibold" style={{ color: a.color }}>{a.label}</p>
        ))}
      </div>
    </div>
  );
}
