"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import { 
  BookOpen, 
  Video, 
  MessageSquare, 
  Users, 
  Settings,
  BarChart3,
  FileText,
  Award
} from "lucide-react";
import Link from "next/link";

// 3D Boy Reading Scene
function BoyReadingScene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={50} />
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={15}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 5, 0]} intensity={0.5} />
      
      {/* Environment */}
      <Environment preset="sunset" />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#e0e7ff" />
      </mesh>
      
      {/* Globe/Platform */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial 
          color="#a5b4fc" 
          transparent 
          opacity={0.3}
          wireframe
        />
      </mesh>
      
      {/* Books floating around */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 4;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 2 + Math.sin(i * 0.5);
        
        return (
          <mesh key={i} position={[x, y, z]} rotation={[0, angle, 0]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.05]} />
            <meshStandardMaterial color={`hsl(${i * 45}, 70%, 60%)`} />
          </mesh>
        );
      })}
      
      {/* Boy placeholder (simple geometric shapes) */}
      <group position={[0, 1, 0]}>
        {/* Head */}
        <mesh position={[0, 1.8, 0]} castShadow>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color="#f0a07c" />
        </mesh>
        
        {/* Body */}
        <mesh position={[0, 1, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 1, 32]} />
          <meshStandardMaterial color="#60a5fa" />
        </mesh>
        
        {/* Book in hands */}
        <mesh position={[0, 1.2, 0.5]} rotation={[-0.5, 0, 0]} castShadow>
          <boxGeometry args={[0.6, 0.8, 0.1]} />
          <meshStandardMaterial color="#f97316" />
        </mesh>
        
        {/* Backpack */}
        <mesh position={[0, 1.2, -0.5]} castShadow>
          <boxGeometry args={[0.5, 0.6, 0.3]} />
          <meshStandardMaterial color="#8b5cf6" />
        </mesh>
      </group>
      
      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <mesh
          key={`particle-${i}`}
          position={[
            (Math.random() - 0.5) * 10,
            Math.random() * 5 + 1,
            (Math.random() - 0.5) * 10,
          ]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </>
  );
}

// Navigation Item Component
function NavItem({ 
  icon: Icon, 
  label, 
  href, 
  active = false 
}: { 
  icon: any; 
  label: string; 
  href: string; 
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
          : "text-gray-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function Home3D() {
  const [selectedNav, setSelectedNav] = useState("home");

  const navItems = [
    { id: "home", icon: BookOpen, label: "Home", href: "/dashboard" },
    { id: "videos", icon: Video, label: "Video Generator", href: "/dashboard/video-generator" },
    { id: "draw", icon: FileText, label: "Draw & Learn", href: "/magic-learn" },
    { id: "classroom", icon: Users, label: "Classroom", href: "/dashboard/classroom" },
    { id: "quiz", icon: Award, label: "Quizzes", href: "/dashboard/quiz" },
    { id: "telegram", icon: MessageSquare, label: "Telegram Bot", href: "/dashboard/telegram" },
    { id: "analytics", icon: BarChart3, label: "Analytics", href: "#" },
    { id: "settings", icon: Settings, label: "Settings", href: "#" },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-72 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Gyan_Intent
          </h1>
          <p className="text-gray-400 text-sm mt-1">EdTech Platform</p>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.id} onClick={() => setSelectedNav(item.id)}>
              <NavItem
                icon={item.icon}
                label={item.label}
                href={item.href}
                active={selectedNav === item.id}
              />
            </div>
          ))}
        </nav>
        
        {/* User Profile */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
              U
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Student</p>
              <p className="text-gray-400 text-xs">Premium Plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 3D Scene */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-black/20 backdrop-blur-sm border-b border-white/10 flex items-center justify-between px-8">
          <h2 className="text-2xl font-bold text-white">
            Welcome to Gyan_Intent
          </h2>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
              Help
            </button>
            <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-semibold transition shadow-lg">
              Get Started
            </button>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4" />
                  <p className="text-white text-lg">Loading 3D Scene...</p>
                </div>
              </div>
            }
          >
            <Canvas shadows>
              <BoyReadingScene />
            </Canvas>
          </Suspense>
          
          {/* Floating Info Cards */}
          <div className="absolute bottom-8 left-8 right-8 flex gap-4 pointer-events-none">
            <div className="flex-1 bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10 pointer-events-auto">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <Video className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-bold">AI Videos</h3>
                  <p className="text-gray-400 text-sm">40-60 sec educational content</p>
                </div>
              </div>
              <Link href="/dashboard/video-generator">
                <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-semibold transition">
                  Generate Video
                </button>
              </Link>
            </div>
            
            <div className="flex-1 bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10 pointer-events-auto">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-cyan-500 flex items-center justify-center">
                  <FileText className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-bold">Solver</h3>
                  <p className="text-gray-400 text-sm">AI-powered problem solving</p>
                </div>
              </div>
              <Link href="/magic-learn">
                <button className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white rounded-lg font-semibold transition">
                  Open Solver
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
