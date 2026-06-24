// hero-animation 全部可调参数
// 改效果 = 改这个文件，不动组件代码

export const HERO_CONFIG = {
  // 长条数量（铺满屏幕需要足够多）
  slatCount: 24,

  // 长条尺寸
  slatWidth: 0.22,
  slatHeight: 5.0,
  slatDepth: 0.06,

  // 长条间距
  slatGap: 0.16,

  // 颜色（蓝紫系）
  hueRange: [225, 275] as [number, number],
  saturation: [0.6, 0.88] as [number, number],
  lightness: [0.50, 0.72] as [number, number],

  // 动画速度
  floatSpeed: 0.5,
  hueShiftSpeed: 0.08,
  mouseInfluence: 0.4,

  // 玻璃材质参数
  glassOpacity: 0.62,
  glassRoughness: 0.12,

  // 光照
  ambientIntensity: 0.35,
  pointLightIntensity: 1.4,
  pointLightColor: "#c4b5fd",

  // 相机
  cameraZ: 5,
  cameraFov: 50,

  // 移动端降级
  mobileGradient:
    "linear-gradient(135deg, #0c0c18 0%, #15102e 35%, #1a0d28 65%, #0c0c18 100%)",
  mobileAccent: "#a78bfa",
} as const;
