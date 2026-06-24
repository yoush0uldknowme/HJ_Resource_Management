"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import * as THREE from "three";
import { Slat } from "./slat-geometry";
import { HERO_CONFIG as C } from "./config";

export default function DesktopScene() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: 1,
    }}>
      <Canvas
        camera={{ position: [0, 0, C.cameraZ], fov: C.cameraFov }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        {/* ===== 光照系统 ===== */}
        <ambientLight intensity={0.35} color="#c4b5fd" />
        <pointLight position={[5, 4, 6]} intensity={1.4} color="#a78bfa" distance={20} />
        <pointLight position={[-5, -3, 4]} intensity={0.9} color="#6366f1" distance={18} />
        <pointLight position={[0, 5, 3]} intensity={0.7} color="#818cf8" distance={15} />
        <directionalLight position={[3, 5, 4]} intensity={0.5} color="#e0e7ff" />

        {/* 长条阵列 */}
        <group rotation={[0, 0, -0.52]}>
          {Array.from({ length: C.slatCount }, (_, i) => (
            <Float
              key={i}
              speed={0.35 + (i % 5) * 0.12}
              rotationIntensity={0.06}
              floatIntensity={0.2}
            >
              <Slat index={i} total={C.slatCount} />
            </Float>
          ))}
        </group>

        {/* 禁止用户交互 */}
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
    </div>
  );
}
