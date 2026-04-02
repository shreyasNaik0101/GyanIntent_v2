"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, isDragging: false, lastX: 0, lastY: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    camera.position.set(0, 2.5, 7);
    camera.lookAt(0, 0, 0);

    // Drag-based rotation
    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.isDragging = true;
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
    };
    const handleMouseUp = () => {
      mouseRef.current.isDragging = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (mouseRef.current.isDragging) {
        const deltaX = e.clientX - mouseRef.current.lastX;
        const deltaY = e.clientY - mouseRef.current.lastY;
        rotationRef.current.y += deltaX * 0.005;
        rotationRef.current.x += deltaY * 0.003;
        rotationRef.current.x = Math.max(-0.5, Math.min(0.5, rotationRef.current.x));
        mouseRef.current.lastX = e.clientX;
        mouseRef.current.lastY = e.clientY;
      }
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseUp);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // ===== GRADUATION CAP - NEURALINK STYLE MESH =====
    const capGroup = new THREE.Group();
    
    // Generate vertices for triangulated mesh on cap
    const capVertices: THREE.Vector3[] = [];
    const capSize = 1.3;
    
    // Create grid of points with some randomization for organic look
    for (let x = -5; x <= 5; x++) {
      for (let z = -5; z <= 5; z++) {
        const px = (x / 5) * capSize + (Math.random() - 0.5) * 0.15;
        const pz = (z / 5) * capSize + (Math.random() - 0.5) * 0.15;
        if (Math.abs(px) <= capSize && Math.abs(pz) <= capSize) {
          capVertices.push(new THREE.Vector3(px, 0.9, pz));
        }
      }
    }
    
    // Add edge vertices for clean border
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * 2 - 1;
      capVertices.push(new THREE.Vector3(t * capSize, 0.9, -capSize));
      capVertices.push(new THREE.Vector3(t * capSize, 0.9, capSize));
      capVertices.push(new THREE.Vector3(-capSize, 0.9, t * capSize));
      capVertices.push(new THREE.Vector3(capSize, 0.9, t * capSize));
    }

    // Connect vertices with triangulated mesh lines
    const meshLineMat = new THREE.LineBasicMaterial({ 
      color: 0x0088ff, 
      transparent: true, 
      opacity: 0.6 
    });
    
    const connections: [THREE.Vector3, THREE.Vector3][] = [];
    
    for (let i = 0; i < capVertices.length; i++) {
      for (let j = i + 1; j < capVertices.length; j++) {
        const dist = capVertices[i].distanceTo(capVertices[j]);
        if (dist > 0.15 && dist < 0.45) {
          connections.push([capVertices[i], capVertices[j]]);
          const lineGeom = new THREE.BufferGeometry().setFromPoints([capVertices[i], capVertices[j]]);
          capGroup.add(new THREE.Line(lineGeom, meshLineMat));
        }
      }
    }

    // Glowing dots at vertices
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ddff });
    capVertices.forEach(v => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), dotMat);
      dot.position.copy(v);
      capGroup.add(dot);
    });

    // Cap border outline
    const borderPoints = [
      new THREE.Vector3(-capSize, 0.9, -capSize),
      new THREE.Vector3(capSize, 0.9, -capSize),
      new THREE.Vector3(capSize, 0.9, capSize),
      new THREE.Vector3(-capSize, 0.9, capSize),
      new THREE.Vector3(-capSize, 0.9, -capSize),
    ];
    const borderGeom = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.9 });
    capGroup.add(new THREE.Line(borderGeom, borderMat));

    // Cap base (head part) - wireframe style
    const baseGeom = new THREE.CylinderGeometry(0.4, 0.55, 0.45, 6);
    const baseEdges = new THREE.EdgesGeometry(baseGeom);
    const baseWire = new THREE.LineSegments(baseEdges, borderMat);
    baseWire.position.y = 0.55;
    capGroup.add(baseWire);

    // Cross mesh on base
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const nextAngle = ((i + 1) / 6) * Math.PI * 2;
      const pts = [
        new THREE.Vector3(Math.cos(angle) * 0.4, 0.78, Math.sin(angle) * 0.4),
        new THREE.Vector3(Math.cos(nextAngle) * 0.55, 0.32, Math.sin(nextAngle) * 0.55),
      ];
      capGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), meshLineMat));
    }

    // Tassel
    const tasselCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(capSize, 0.9, 0),
      new THREE.Vector3(capSize + 0.4, 0.5, 0.1),
      new THREE.Vector3(capSize + 0.3, 0, 0),
    ]);
    const tasselGeom = new THREE.TubeGeometry(tasselCurve, 20, 0.015, 8, false);
    capGroup.add(new THREE.Mesh(tasselGeom, new THREE.MeshBasicMaterial({ color: 0x00ffaa })));

    // Tassel end strands
    for (let i = 0; i < 5; i++) {
      const strand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.01, 0.1, 4),
        new THREE.MeshBasicMaterial({ color: 0x00ffaa })
      );
      strand.position.set(capSize + 0.3 + (i - 2) * 0.025, -0.05, (i % 2 - 0.5) * 0.02);
      capGroup.add(strand);
    }

    capGroup.position.y = 1.6;
    capGroup.rotation.x = -0.35; // Tilt for isometric view showing top
    capGroup.rotation.z = 0.1;
    mainGroup.add(capGroup);

    // ===== REALISTIC CHIP =====
    const chipGroup = new THREE.Group();
    
    // Chip base
    const chipBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.12, 2.0),
      new THREE.MeshBasicMaterial({ color: 0x001520 })
    );
    chipGroup.add(chipBase);

    // Chip surface with glow
    const chipSurface = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.06, 1.75),
      new THREE.MeshBasicMaterial({ color: 0x0088bb, transparent: true, opacity: 0.95 })
    );
    chipSurface.position.y = 0.08;
    chipGroup.add(chipSurface);

    // Rounded corners effect (edge glow)
    const chipBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2.0, 0.12, 2.0)),
      new THREE.LineBasicMaterial({ color: 0x00ddff })
    );
    chipGroup.add(chipBorder);

    const innerBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.75, 0.06, 1.75)),
      new THREE.LineBasicMaterial({ color: 0x00aacc })
    );
    innerBorder.position.y = 0.08;
    chipGroup.add(innerBorder);

    // "GYAN" text - bold and visible
    const textMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const textLineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const textGroup = new THREE.Group();
    
    // G
    const gShape = new THREE.Shape();
    gShape.moveTo(-0.52, 0.15);
    gShape.lineTo(-0.62, 0.1);
    gShape.lineTo(-0.62, -0.1);
    gShape.lineTo(-0.52, -0.15);
    gShape.lineTo(-0.42, -0.1);
    gShape.lineTo(-0.42, 0);
    gShape.lineTo(-0.52, 0);
    const gGeom = new THREE.ShapeGeometry(gShape);
    gGeom.rotateX(-Math.PI / 2);
    const gMesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.52, 0.12, 0.15),
      new THREE.Vector3(-0.62, 0.12, 0.1),
      new THREE.Vector3(-0.62, 0.12, -0.1),
      new THREE.Vector3(-0.52, 0.12, -0.15),
      new THREE.Vector3(-0.42, 0.12, -0.1),
      new THREE.Vector3(-0.42, 0.12, 0),
      new THREE.Vector3(-0.52, 0.12, 0),
    ]), textLineMat);
    textGroup.add(gMesh);

    // Y
    textGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.3, 0.12, 0.15),
      new THREE.Vector3(-0.2, 0.12, 0),
    ]), textLineMat));
    textGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.1, 0.12, 0.15),
      new THREE.Vector3(-0.2, 0.12, 0),
      new THREE.Vector3(-0.2, 0.12, -0.15),
    ]), textLineMat));

    // A
    textGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.05, 0.12, -0.15),
      new THREE.Vector3(0.18, 0.12, 0.15),
      new THREE.Vector3(0.31, 0.12, -0.15),
    ]), textLineMat));
    textGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.1, 0.12, 0),
      new THREE.Vector3(0.26, 0.12, 0),
    ]), textLineMat));

    // N
    textGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.4, 0.12, -0.15),
      new THREE.Vector3(0.4, 0.12, 0.15),
      new THREE.Vector3(0.56, 0.12, -0.15),
      new THREE.Vector3(0.56, 0.12, 0.15),
    ]), textLineMat));

    chipGroup.add(textGroup);

    // Chip pins with chevron markers
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < 7; i++) {
        const offset = (i - 3) * 0.24;
        const pinGeom = new THREE.BoxGeometry(0.05, 0.06, 0.18);
        const pin = new THREE.Mesh(pinGeom, new THREE.MeshBasicMaterial({ color: 0x223344 }));
        
        if (side === 0) pin.position.set(offset, -0.03, 1.08);
        else if (side === 1) pin.position.set(offset, -0.03, -1.08);
        else if (side === 2) { pin.rotation.y = Math.PI / 2; pin.position.set(1.08, -0.03, offset); }
        else { pin.rotation.y = Math.PI / 2; pin.position.set(-1.08, -0.03, offset); }
        
        chipGroup.add(pin);

        // Chevron arrow on each pin direction
        const chevronPts: THREE.Vector3[] = [];
        const chevronDist = 0.08;
        if (side === 0) {
          chevronPts.push(new THREE.Vector3(offset - 0.04, -0.02, 1.2));
          chevronPts.push(new THREE.Vector3(offset, -0.02, 1.2 + chevronDist));
          chevronPts.push(new THREE.Vector3(offset + 0.04, -0.02, 1.2));
        } else if (side === 1) {
          chevronPts.push(new THREE.Vector3(offset - 0.04, -0.02, -1.2));
          chevronPts.push(new THREE.Vector3(offset, -0.02, -1.2 - chevronDist));
          chevronPts.push(new THREE.Vector3(offset + 0.04, -0.02, -1.2));
        } else if (side === 2) {
          chevronPts.push(new THREE.Vector3(1.2, -0.02, offset - 0.04));
          chevronPts.push(new THREE.Vector3(1.2 + chevronDist, -0.02, offset));
          chevronPts.push(new THREE.Vector3(1.2, -0.02, offset + 0.04));
        } else {
          chevronPts.push(new THREE.Vector3(-1.2, -0.02, offset - 0.04));
          chevronPts.push(new THREE.Vector3(-1.2 - chevronDist, -0.02, offset));
          chevronPts.push(new THREE.Vector3(-1.2, -0.02, offset + 0.04));
        }
        const chevron = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(chevronPts),
          new THREE.LineBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.7 })
        );
        chipGroup.add(chevron);
      }
    }

    // Glow beneath
    const glowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 2.8),
      new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    );
    glowPlane.rotation.x = -Math.PI / 2;
    glowPlane.position.y = -0.1;
    chipGroup.add(glowPlane);

    chipGroup.position.y = -0.5;
    mainGroup.add(chipGroup);

    // ===== CIRCUIT LINES WITH ELECTRIC LIGHT FLOW =====
    interface CircuitLine {
      baseLine: THREE.Line;
      glowLine: THREE.Line;
      path: THREE.Vector3[];
      glowSegments: THREE.Line[];
    }
    
    const circuitLines: CircuitLine[] = [];
    const pulseData: { lineIndex: number; position: number; speed: number }[] = [];

    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const isLong = i % 3 === 0;
      const length = isLong ? 4.0 : 2.5;
      
      const path: THREE.Vector3[] = [];
      const startR = 1.12;
      path.push(new THREE.Vector3(Math.cos(angle) * startR, -0.5, Math.sin(angle) * startR));
      
      if (isLong) {
        const mid1 = 1.8;
        path.push(new THREE.Vector3(Math.cos(angle) * mid1, -0.5, Math.sin(angle) * mid1));
        
        const perpAngle = angle + Math.PI / 2;
        const jog = 0.18;
        path.push(new THREE.Vector3(
          Math.cos(angle) * mid1 + Math.cos(perpAngle) * jog, -0.5,
          Math.sin(angle) * mid1 + Math.sin(perpAngle) * jog
        ));
        
        const mid2 = 2.8;
        path.push(new THREE.Vector3(
          Math.cos(angle) * mid2 + Math.cos(perpAngle) * jog, -0.5,
          Math.sin(angle) * mid2 + Math.sin(perpAngle) * jog
        ));
        
        path.push(new THREE.Vector3(
          Math.cos(angle) * length + Math.cos(perpAngle) * jog, -0.5,
          Math.sin(angle) * length + Math.sin(perpAngle) * jog
        ));
      } else {
        path.push(new THREE.Vector3(Math.cos(angle) * 1.6, -0.5, Math.sin(angle) * 1.6));
        path.push(new THREE.Vector3(Math.cos(angle) * length, -0.5, Math.sin(angle) * length));
      }

      // Base circuit line (dark)
      const baseLineGeom = new THREE.BufferGeometry().setFromPoints(path);
      const baseLine = new THREE.Line(baseLineGeom, new THREE.LineBasicMaterial({ 
        color: 0x002244, 
        transparent: true, 
        opacity: 0.9 
      }));
      mainGroup.add(baseLine);

      // Glow line (brighter, follows same path)
      const glowLine = new THREE.Line(baseLineGeom.clone(), new THREE.LineBasicMaterial({ 
        color: 0x0066aa, 
        transparent: true, 
        opacity: 0.4 
      }));
      mainGroup.add(glowLine);

      // Create glow segments for traveling light effect
      const glowSegments: THREE.Line[] = [];
      const segmentCount = path.length - 1;
      
      for (let s = 0; s < segmentCount; s++) {
        const segGeom = new THREE.BufferGeometry().setFromPoints([path[s], path[s + 1]]);
        // Bright cyan glow line
        const segLine = new THREE.Line(segGeom, new THREE.LineBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0
        }));
        mainGroup.add(segLine);
        glowSegments.push(segLine);
        
        // Extra bright white core
        const coreSegLine = new THREE.Line(segGeom.clone(), new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0
        }));
        mainGroup.add(coreSegLine);
        glowSegments.push(coreSegLine);
      }

      circuitLines.push({ baseLine, glowLine, path, glowSegments });

      // End dot (will glow)
      const endDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 })
      );
      endDot.position.copy(path[path.length - 1]);
      mainGroup.add(endDot);
      
      // Outer glow for end dot
      const endDotGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.3 })
      );
      endDotGlow.position.copy(path[path.length - 1]);
      mainGroup.add(endDotGlow);

      // Create pulse data (slow speed)
      pulseData.push({
        lineIndex: i,
        position: Math.random(),
        speed: 0.003 + Math.random() * 0.002 // Very slow
      });
    }

    // ===== BACKGROUND PARTICLES =====
    const particleCount = 250;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 3.5 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      particlePositions[i * 3] = Math.cos(theta) * r;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 5;
      particlePositions[i * 3 + 2] = Math.sin(theta) * r;
    }
    const particlesGeom = new THREE.BufferGeometry();
    particlesGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(particlesGeom, new THREE.PointsMaterial({
      color: 0x0077dd,
      size: 0.04,
      transparent: true,
      opacity: 0.5
    }));
    scene.add(particles);

    // ===== ANIMATION =====
    let time = 0;

    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.016;

      // Smooth drag-based rotation
      mainGroup.rotation.y += (rotationRef.current.y - mainGroup.rotation.y) * 0.1;
      mainGroup.rotation.x += (rotationRef.current.x - mainGroup.rotation.x) * 0.1;

      // Floating cap
      capGroup.position.y = 1.6 + Math.sin(time * 0.5) * 0.1;

      // Animate electric light flow along circuits
      pulseData.forEach((pulse, idx) => {
        pulse.position += pulse.speed;
        if (pulse.position > 1) pulse.position = 0;

        const circuit = circuitLines[pulse.lineIndex];
        const totalSegs = circuit.path.length - 1;
        
        // Light up segments based on pulse position (pairs: cyan + white core)
        for (let segIdx = 0; segIdx < totalSegs; segIdx++) {
          const segStart = segIdx / totalSegs;
          const segEnd = (segIdx + 1) / totalSegs;
          
          // Wider pulse for more visible glow
          const pulseWidth = 0.35;
          const pulseCenter = pulse.position;
          
          let opacity = 0;
          if (pulseCenter >= segStart - pulseWidth && pulseCenter <= segEnd + pulseWidth) {
            const segMid = (segStart + segEnd) / 2;
            const dist = Math.abs(pulseCenter - segMid);
            opacity = Math.max(0, 1 - dist / pulseWidth);
          }
          
          // Cyan glow (very bright)
          const cyanSeg = circuit.glowSegments[segIdx * 2];
          (cyanSeg.material as THREE.LineBasicMaterial).opacity = opacity * 1.2;
          
          // White core (intense bright center)
          const whiteSeg = circuit.glowSegments[segIdx * 2 + 1];
          (whiteSeg.material as THREE.LineBasicMaterial).opacity = opacity * 1.0;
        }
      });

      // Glow pulse
      (glowPlane.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(time * 1.5) * 0.08;

      // Particles
      particles.rotation.y = time * 0.01;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseUp);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
      style={{ 
        background: 'radial-gradient(ellipse at center bottom, #001133 0%, #000011 50%, #000000 100%)' 
      }}
    />
  );
}
