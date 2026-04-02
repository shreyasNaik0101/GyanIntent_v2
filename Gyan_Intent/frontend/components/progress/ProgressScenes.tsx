"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

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

// ─── 3D Pie Slice (extruded wedge) ──────────────────────────────────────────
function PieSlice({ startAngle, endAngle, color, explode, delay }: {
  startAngle: number; endAngle: number; color: string; explode: number; delay: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const scaleRef = useRef(0.01);
  const midAngle = (startAngle + endAngle) / 2;
  const R = 2;

  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    const segs = 48;
    for (let i = 0; i <= segs; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / segs);
      shape.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    shape.lineTo(0, 0);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.55,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
  }, [startAngle, endAngle]);

  // explode offset in XZ plane (pie lies flat)
  const offX = Math.cos(midAngle) * explode;
  const offZ = -Math.sin(midAngle) * explode;

  useFrame((_, d) => {
    scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, 1, d * (1.5 - delay * 0.15));
    if (ref.current) {
      ref.current.scale.set(scaleRef.current, scaleRef.current, scaleRef.current);
    }
  });

  return (
    <group ref={ref} position={[offX, 0, offZ]}>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} metalness={0.35} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function RotatingPie({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.15;
  });
  return <group ref={ref}>{children}</group>;
}

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

/* ═══════════════════════════════════════════════════════════════════════ */

interface Props {
  section: "weekly" | "subjects" | "achievements";
  subjects?: { name: string; progress: number; color: string }[];
}

const cmap: Record<string, string> = {
  "from-purple-500 to-pink-500": "#a855f7",
  "from-blue-500 to-cyan-500": "#3b82f6",
  "from-green-500 to-emerald-500": "#22c55e",
  "from-orange-500 to-amber-500": "#f59e0b",
};

export default function ProgressScene({ section, subjects = [] }: Props) {
  if (section === "weekly") {
    const vals = [65, 80, 45, 90, 70, 55, 85];
    const cols = ["#a855f7", "#ec4899", "#6366f1", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return (
      <div style={{ width: "100%", height: 300, borderRadius: 16, overflow: "hidden", background: "linear-gradient(180deg,#0a0a1a,#050510)" }}>
        <Canvas camera={{ position: [0, 3, 7], fov: 35 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} />
          <pointLight position={[-3, 4, 2]} intensity={1} color="#a855f7" />
          <pointLight position={[3, 4, 2]} intensity={1} color="#ec4899" />
          <group position={[-2.7, -1, 0]}>
            {vals.map((v, i) => <Bar key={i} h={(v / 100) * 3} x={i * 0.9} color={cols[i]} delay={i} />)}
          </group>
        </Canvas>
        <div style={{ display: "flex", justifyContent: "space-around", padding: "0 32px", marginTop: -32, position: "relative", zIndex: 10 }}>
          {days.map((d, i) => (
            <div key={d} style={{ textAlign: "center" }}>
              <p style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>{vals[i]}%</p>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section === "subjects") {
    const total = subjects.reduce((sum, s) => sum + s.progress, 0);
    const sliceColors = ["#2dd4bf", "#f97316", "#a3e635", "#22d3ee", "#a855f7", "#f43f5e"];
    let cumAngle = 0;
    const slices = subjects.map((s, i) => {
      const angle = (s.progress / total) * Math.PI * 2;
      const start = cumAngle;
      cumAngle += angle;
      return { name: s.name, progress: s.progress, start, end: cumAngle, color: sliceColors[i % sliceColors.length] };
    });

    return (
      <div style={{ width: "100%", height: 340, borderRadius: 16, overflow: "hidden", background: "linear-gradient(180deg,#0a0a1a,#050510)", position: "relative" }}>
        <Canvas camera={{ position: [0, 4, 5], fov: 38 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 10, 5]} intensity={1.2} />
          <directionalLight position={[-3, 6, -3]} intensity={0.4} />
          <pointLight position={[0, -2, 3]} intensity={0.6} color="#2dd4bf" />
          <pointLight position={[3, 3, -2]} intensity={0.5} color="#22d3ee" />

          <RotatingPie>
            <group rotation={[-0.3, 0, 0]}>
              {slices.map((sl, i) => (
                <PieSlice key={sl.name} startAngle={sl.start} endAngle={sl.end} color={sl.color} explode={0.15} delay={i} />
              ))}
            </group>
          </RotatingPie>
        </Canvas>

        {/* Legend overlay */}
        <div style={{ position: "absolute", right: 24, top: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {slices.map(sl => (
            <div key={sl.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: sl.color }} />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{sl.name} — {sl.progress}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // achievements
  const achData = [
    { label: "🔥 7-Day Streak", color: "#f97316" },
    { label: "📚 Course Master", color: "#3b82f6" },
    { label: "🎯 Quiz Champ", color: "#a855f7" },
    { label: "⭐ Top Learner", color: "#fbbf24" },
  ];
  return (
    <div style={{ width: "100%", height: 300, borderRadius: 16, overflow: "hidden", background: "linear-gradient(180deg,#0a0a1a,#050510)" }}>
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
      <div style={{ display: "flex", justifyContent: "space-around", padding: "0 24px", marginTop: -40, position: "relative", zIndex: 10 }}>
        {achData.map(a => <p key={a.label} style={{ color: a.color, fontSize: 11, fontWeight: 600 }}>{a.label}</p>)}
      </div>
    </div>
  );
}
