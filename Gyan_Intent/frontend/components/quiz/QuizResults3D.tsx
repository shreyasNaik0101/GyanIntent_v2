"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Float, MeshDistortMaterial, RoundedBox, Environment, Stars } from "@react-three/drei";
import * as THREE from "three";

// ─── Animated Bar ───────────────────────────────────────────────────────────
function Bar({ height, color, position, label, value, delay }: {
  height: number; color: string; position: [number, number, number];
  label: string; value: number; delay: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const scaleRef = useRef(0);

  useFrame((_, delta) => {
    scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, 1, delta * (1.5 - delay * 0.5));
    if (meshRef.current) {
      meshRef.current.scale.y = scaleRef.current;
      meshRef.current.position.y = (height * scaleRef.current) / 2;
    }
  });

  return (
    <group position={position}>
      <RoundedBox ref={meshRef} args={[1.2, height, 1.2]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
      </RoundedBox>
      <Text position={[0, height + 0.5, 0]} fontSize={0.6} color="white" anchorX="center" anchorY="middle">
        {value.toString()}
      </Text>
      <Text position={[0, -0.5, 0]} fontSize={0.35} color="#888" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

// ─── Floating Trophy ────────────────────────────────────────────────────────
function TrophyMesh({ score, total }: { score: number; total: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const percentage = total > 0 ? score / total : 0;

  // Gold color intensity based on score
  const goldColor = useMemo(() => {
    if (percentage >= 0.8) return "#FFD700";
    if (percentage >= 0.5) return "#C0C0C0";
    return "#CD7F32";
  }, [percentage]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={groupRef} position={[0, 2.5, 0]}>
        {/* Trophy cup */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.6, 0.3, 0.8, 32]} />
          <MeshDistortMaterial color={goldColor} roughness={0.2} metalness={0.9} distort={0.1} speed={2} />
        </mesh>
        {/* Trophy base */}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
          <meshStandardMaterial color={goldColor} roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.4, 0.45, 0.2, 32]} />
          <meshStandardMaterial color={goldColor} roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Handles */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.7, 0.4, 0]} rotation={[0, 0, side * 0.3]}>
            <torusGeometry args={[0.2, 0.05, 8, 16, Math.PI]} />
            <meshStandardMaterial color={goldColor} roughness={0.3} metalness={0.8} />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

// ─── Orbiting Particles ─────────────────────────────────────────────────────
function ScoreParticles({ count, color }: { count: number; color: string }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 3 + Math.random() * 2;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color={color} transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

// ─── Percentage Ring ────────────────────────────────────────────────────────
function PercentageRing({ percentage }: { percentage: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const arcRef = useRef(0);

  useFrame((_, delta) => {
    arcRef.current = THREE.MathUtils.lerp(arcRef.current, percentage, delta * 2);
    if (ref.current) {
      const geo = new THREE.TorusGeometry(1.8, 0.08, 8, 64, arcRef.current * Math.PI * 2);
      ref.current.geometry.dispose();
      ref.current.geometry = geo;
    }
  });

  return (
    <group position={[0, 2.5, 0]} rotation={[0, 0, Math.PI / 2]}>
      {/* Background ring */}
      <mesh>
        <torusGeometry args={[1.8, 0.04, 8, 64]} />
        <meshStandardMaterial color="#333" transparent opacity={0.5} />
      </mesh>
      {/* Progress ring */}
      <mesh ref={ref}>
        <torusGeometry args={[1.8, 0.08, 8, 64, 0.01]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ─── Ground Plane ───────────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#111" roughness={0.8} metalness={0.2} transparent opacity={0.5} />
    </mesh>
  );
}

// ─── Main 3D Scene ──────────────────────────────────────────────────────────
interface QuizResults3DProps {
  correct: number;
  incorrect: number;
  score: number;
  total: number;
}

export default function QuizResults3D({ correct, incorrect, score, total }: QuizResults3DProps) {
  const percentage = total > 0 ? correct / total : 0;
  const maxBarHeight = 4;
  const correctHeight = total > 0 ? Math.max(0.3, (correct / total) * maxBarHeight) : 0.3;
  const incorrectHeight = total > 0 ? Math.max(0.3, (incorrect / total) * maxBarHeight) : 0.3;

  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-white/10 bg-black/50">
      <Canvas camera={{ position: [0, 3, 8], fov: 45 }} shadows>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
        <pointLight position={[-3, 4, -3]} intensity={0.5} color="#a855f7" />
        <pointLight position={[3, 4, 3]} intensity={0.5} color="#ec4899" />

        <Stars radius={50} depth={50} count={1000} factor={3} saturation={0.5} fade speed={1} />

        {/* 3D Bar Chart */}
        <Bar height={correctHeight} color="#22c55e" position={[-1.5, -1, 0]} label="Correct" value={correct} delay={0} />
        <Bar height={incorrectHeight} color="#ef4444" position={[1.5, -1, 0]} label="Wrong" value={incorrect} delay={0.3} />

        {/* Trophy */}
        <TrophyMesh score={correct} total={total} />

        {/* Percentage Ring around trophy */}
        <PercentageRing percentage={percentage} />

        {/* Score text */}
        <Text position={[0, 2.5, 0]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">
          {`${Math.round(percentage * 100)}%`}
        </Text>

        {/* Particles */}
        <ScoreParticles count={correct * 10 + 20} color="#22c55e" />
        <ScoreParticles count={10} color="#a855f7" />

        <Ground />
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}
