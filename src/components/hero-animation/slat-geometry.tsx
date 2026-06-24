"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HERO_CONFIG as C } from "./config";

// 确定性随机（避免 SSR hydration 问题）
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SlatProps {
  index: number;
  total: number;
}

export function Slat({ index, total }: SlatProps) {
  const groupRef = useRef<THREE.Group>(null);
  const random = useMemo(() => mulberry32(index * 137 + 42), [index]);

  // 每根长条的固定参数
  const params = useMemo(() => ({
    x: (index - total / 2) * (C.slatWidth + C.slatGap),
    hue: C.hueRange[0] + random() * (C.hueRange[1] - C.hueRange[0]),
    sat: C.saturation[0] + random() * (C.saturation[1] - C.saturation[0]),
    light: C.lightness[0] + random() * (C.lightness[1] - C.lightness[0]),
    speed: 0.25 + random() * C.floatSpeed,
    phase: random() * Math.PI * 2,
    hueDriftRange: 20 + random() * 40, // 每根条不同的色相漂移范围
    hueDriftSpeed: 0.04 + random() * 0.08, // 不同速度
  }), [index, total]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // 缓慢上下浮动
    groupRef.current.position.y =
      Math.sin(t * params.speed + params.phase) * 0.18;

    // 轻微 Z 轴呼吸
    groupRef.current.position.z =
      Math.sin(t * params.speed * 0.6 + params.phase + 1) * 0.06;

    // 鼠标微影响
    const mx = state.mouse.x * C.mouseInfluence * 0.15;
    groupRef.current.position.x += (params.x + mx - groupRef.current.position.x) * 0.03;
  });

  // HSL → RGB 转换
  const hslToRgb = (h: number, s: number, l: number): THREE.Color => {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 60 * 12) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return new THREE.Color(f(0), f(8), f(4));
  };

  const mainColor = useMemo(() => hslToRgb(params.hue, params.sat, params.light), [params.hue]);
  const glowColor = useMemo(() => hslToRgb(params.hue, params.sat * 0.7, Math.min(params.light + 0.2, 0.85)), [params.hue]);
  const edgeColor = useMemo(() => hslToRgb(params.hue, params.sat * 0.5, Math.min(params.light + 0.35, 0.95)), [params.hue]);

  return (
    <group ref={groupRef} position={[params.x, 0, 0]}>
      {/* ===== 第1层：主体 — 半透明玻璃感 ===== */}
      <mesh>
        <boxGeometry args={[C.slatWidth, C.slatHeight, C.slatDepth]} />
        <meshPhysicalMaterial
          color={mainColor}
          transparent
          opacity={C.glassOpacity}
          roughness={C.glassRoughness}
          metalness={0.1}
          clearcoat={0.6}
          clearcoatRoughness={0.15}
          side={THREE.DoubleSide}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* ===== 第2层：内部发光 —— 让长条"亮起来" ===== */}
      <mesh position={[0, 0, 0.001]}>
        <boxGeometry args={[C.slatWidth * 0.85, C.slatHeight * 0.92, C.slatDepth * 0.9]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ===== 第3层：边缘高光 —— 玻璃边框感 ===== */}
      <mesh position={[0, 0, 0.002]}>
        <boxGeometry args={[C.slatWidth * 0.98, C.slatHeight * 0.98, C.slatDepth * 0.99]} />
        <meshBasicMaterial
          color={edgeColor}
          transparent
          opacity={0.12}
          wireframe
        />
      </mesh>

      {/* ===== 第4层：顶部高光带 —— 反光效果 ===== */}
      <mesh position={[0, C.slatHeight * 0.28, 0.003]} rotation={[0, 0, 0]}>
        <boxGeometry args={[C.slatWidth * 0.7, C.slatHeight * 0.12, C.slatDepth * 0.95]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.10 + random() * 0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
