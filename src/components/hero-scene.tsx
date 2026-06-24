"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/* --------------------------------------------------------------------------
   MiMo 风格交互式 Hero 场景
   - 自定义光标（小圆点跟随）
   - 三层动画地球（光环 + 经纬线 + 点阵陆地自转）
   - 标题区悬停反转大球
   -------------------------------------------------------------------------- */

/* ====== 简化世界大陆轮廓坐标 [lat, lng] —— 用于生成点阵地球 ====== */
const CONTINENT_POINTS: number[][] = [
  // === 北美洲 ===
  ...rangePoints([
    [68, -165], [70, -145], [72, -130], [70, -125], [65, -125],
    [60, -140], [55, -158], [50, -170], [48, -125], [45, -125],
    [40, -124], [35, -120], [30, -115], [25, -110], [20, -105],
    [25, -95], [28, -90], [30, -85], [32, -82], [28, -80],
    [26, -81], [22, -80], [18, -84], [15, -87], [12, -86],
    [10, -83], [14, -83], [16, -88], [19, -94], [21, -97],
    [23, -100], [24, -107], [27, -110], [30, -115], [33, -118],
    [37, -122], [42, -123], [48, -124], [52, -128], [56, -132],
    [60, -138], [64, -148], [67, -158], [68, -165],
  ], 1.2),
  // === 南美洲 ===
  ...rangePoints([
    [12, -75], [11, -73], [9, -76], [7, -77], [5, -78],
    [4, -80], [0, -79], [-3, -80], [-6, -80], [-8, -78],
    [-12, -77], [-17, -71], [-22, -68], [-29, -66], [-34, -57],
    [-38, -58], [-43, -64], [-47, -66], [-51, -69], [-54, -68],
    [-55, -66], [-52, -62], [-48, -61], [-44, -63], [-41, -64],
    [-36, -61], [-31, -59], [-25, -58], [-19, -62], [-15, -68],
    [-11, -74], [-7, -76], [-2, -78], [2, -78], [6, -78],
    [9, -77], [11, -75], [12, -75],
  ], 1.0),
  // === 欧洲 ===
  ...rangePoints([
    [38, -9], [36, -8], [37, -5], [39, -3], [43, -8],
    [44, -9], [46, -10], [47, -9], [48, -7], [49, -5],
    [51, -4], [52, -3], [53, -2], [54, -3], [55, -5],
    [56, -8], [57, -9], [58, -10], [59, -10], [60, -8],
    [61, -6], [62, -5], [63, -8], [64, -12], [65, -13],
    [66, -14], [67, -15], [68, -18], [69, -22], [70, -28],
    [68, -20], [66, -16], [64, -13], [62, -10], [60, -7],
    [58, -5], [56, -3], [54, -2], [52, -4], [50, -5],
    [48, -6], [46, -7], [44, -6], [42, -5], [40, -4],
    [38, -4], [37, -6], [36, -8], [38, -9],
  ], 0.8),
  // === 非洲 ===
  ...rangePoints([
    [37, -5], [36, -8], [33, -10], [32, -12], [32, -15],
    [30, -16], [28, -17], [25, -17], [23, -17], [20, -17],
    [17, -17], [14, -17], [12, -18], [10, -17], [7, -16],
    [5, -15], [3, -14], [2, -12], [1, -10], [2, -8],
    [4, -8], [5, -10], [5, -13], [4, -16], [3, -18],
    [2, -21], [0, -23], [-3, -25], [-6, -28], [-10, -30],
    [-15, -32], [-20, -33], [-25, -32], [-30, -30], [-34, -26],
    [-34, -22], [-33, -18], [-32, -16], [-32, -12], [-33, -10],
    [-34, -8], [-34, -6], [-34, -4], [-33, -2], [-32, 0],
    [-31, 3], [-30, 7], [-29, 10], [-28, 12], [-26, 14],
    [-23, 15], [-20, 16], [-17, 16], [-14, 16], [-11, 15],
    [-8, 14], [-5, 13], [-3, 12], [-2, 11], [0, 10],
    [2, 10], [5, 10], [8, 10], [11, 10], [14, 10],
    [17, 10], [20, 10], [23, 10], [26, 10], [29, 10],
    [32, 10], [35, 10], [37, 9], [37, 7], [37, 5],
    [37, 3], [37, 1], [37, -3], [37, -5],
  ], 0.9),
  // === 亚洲 ===
  ...rangePoints([
    [42, 40], [40, 38], [38, 36], [36, 34], [34, 32],
    [32, 30], [30, 28], [28, 26], [26, 24], [24, 22],
    [22, 20], [22, 18], [21, 16], [20, 14], [19, 12],
    [18, 10], [17, 8], [18, 7], [19, 6], [20, 6],
    [22, 7], [24, 8], [26, 9], [28, 10], [30, 11],
    [32, 12], [34, 13], [36, 14], [38, 15], [40, 16],
    [42, 17], [44, 18], [46, 19], [48, 20], [50, 21],
    [52, 22], [54, 23], [56, 24], [58, 25], [60, 26],
    [62, 27], [64, 28], [66, 28], [68, 27], [70, 26],
    [72, 24], [70, 30], [68, 32], [66, 34], [64, 36],
    [62, 38], [60, 40], [58, 42], [56, 44], [54, 46],
    [52, 48], [50, 50], [48, 52], [46, 54], [44, 56],
    [42, 58], [40, 56], [38, 54], [36, 52], [34, 50],
    [32, 48], [30, 46], [28, 44], [26, 42], [24, 40],
    [22, 38], [20, 36], [18, 34], [16, 32], [14, 30],
    [12, 28], [10, 26], [8, 24], [6, 22], [4, 20],
    [2, 18], [0, 16], [-2, 14], [-4, 12], [-6, 10],
    [-8, 8], [-8, 6], [-8, 4], [-6, 2], [-4, 0],
    [-2, -2], [0, -4], [2, -6], [4, -8], [6, -10],
    [8, -12], [10, -14], [12, -16], [14, -18], [16, -20],
    [18, -22], [20, -24], [22, -26], [24, -28], [26, -30],
    [28, -32], [30, -34], [32, -36], [34, -38], [36, -40],
    [38, -38], [40, -36], [42, -34], [44, -32], [46, -30],
    [48, -28], [50, -26], [52, -24], [54, -22], [56, -20],
    [58, -18], [60, -16], [58, -14], [56, -12], [54, -10],
    [52, -8], [50, -6], [48, -4], [46, -2], [44, 0],
    [42, 2], [40, 4], [38, 6], [36, 8], [34, 10],
    [32, 12], [30, 14], [28, 16], [26, 18], [24, 20],
    [22, 22], [20, 24], [18, 26], [16, 28], [14, 30],
    [12, 32], [10, 34], [8, 36], [6, 38], [4, 40],
    [42, 40],
  ], 0.7),
  // === 澳大利亚 ===
  ...rangePoints([
    [-12, 132], [-13, 131], [-14, 130], [-15, 129], [-16, 128],
    [-17, 127], [-18, 126], [-19, 125], [-20, 124], [-21, 124],
    [-22, 125], [-24, 126], [-26, 128], [-28, 130], [-30, 133],
    [-33, 136], [ -34, 139], [-35, 142], [-36, 146], [-37, 150],
    [-38, 153], [-37, 152], [-35, 149], [-34, 147], [-32, 144],
    [-30, 141], [-28, 138], [-26, 135], [-24, 134], [-22, 134],
    [-20, 135], [-18, 136], [-16, 137], [-14, 137], [-12, 136],
    [-11, 135], [-11, 134], [-11, 133], [-12, 132],
  ], 0.8),
];

/**
 * 沿多边形路径生成密集采样点
 * @param coords [[lat,lng], ...] 多边形顶点
 * @param step  采样间距
 */
function rangePoints(coords: number[][], step: number): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < coords.length; i++) {
    const [lat1, lng1] = coords[i];
    const [lat2, lng2] = coords[(i + 1) % coords.length];
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    const steps = Math.max(1, Math.ceil(dist / step));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      pts.push([lat1 + dLat * t, lng1 + dLng * t]);
    }
  }
  return pts;
}

/** 球面坐标 → 正交投影 */
function project(lat: number, lng: number, rotationY: number, radius: number, cx: number, cy: number) {
  const φ = (lat * Math.PI) / 180;
  const θ = ((lng - rotationY) * Math.PI) / 180;
  const x = cx + radius * Math.cos(φ) * Math.sin(θ);
  const y = cy - radius * Math.sin(φ) * 0.55; /* 扁圆效果模拟倾斜 */
  const z = Math.cos(φ) * Math.cos(θ);
  return { x, y, z };
}

export function HeroScene({
  primaryHref,
  userLabel,
  stats,
}: {
  primaryHref: string;
  userLabel: string;
  stats?: {
    total: number;
    inStock: number;
    checkedOut: number;
    pending: number;
  } | null;
}) {
  /* ---- 状态 ---- */
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [isOverTitle, setIsOverTitle] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const globeSvgRef = useRef<SVGSVGElement>(null);
  const animFrameRef = useRef<number>(0);
  const rotRef = useRef(0);       /* 地球 Y 轴旋转角度 */
  const haloRotRef = useRef(0);   /* 外圈光环角度 */

  /* ---- 光标跟随 ---- */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    document.body.style.cursor = "none";
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.style.cursor = "";
    };
  }, [handleMouseMove]);

  /* ---- 地球动画循环 ---- */
  useEffect(() => {
    let start: number | null = null;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const dt = timestamp - (start || timestamp);

      rotRef.current += 0.28;         /* 地球自转速度 */
      haloRotRef.current += 0.15;     /* 外圈光环速度（更慢） */

      renderGlobe();
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 每帧重新渲染地球 SVG 内容 */
  const renderGlobe = () => {
    if (!globeSvgRef.current) return;
    const svg = globeSvgRef.current;

    /* 清空旧内容（保留 defs） */
    const oldDynamic = svg.querySelectorAll("[data-dynamic]");
    oldDynamic.forEach((el) => el.remove());

    const R = 140;        /* 地球半径 */
    const CX = 200;       /* 中心 X */
    const CY = 195;       /* 中心 Y */
    const rot = rotRef.current;
    const hRot = haloRotRef.current;

    const ns = "http://www.w3.org/2000/svg";

    /* ===== 1. 外层旋转光环 ===== */
    const haloGroup = document.createElementNS(ns, "g");
    haloGroup.setAttribute("data-dynamic", "halo");
    const halo = document.createElementNS(ns, "ellipse");
    halo.setAttribute("cx", String(CX));
    halo.setAttribute("cy", String(CY + 15));
    halo.setAttribute("rx", "185");
    halo.setAttribute("ry", "70");
    halo.setAttribute("stroke", "#E5E5E0");
    halo.setAttribute("stroke-width", "0.8");
    halo.setAttribute("fill", "none");
    halo.setAttribute("opacity", "0.5");
    const tiltDeg = -12 + Math.sin(hRot * 0.008) * 6; /* 轻微摆动 */
    halo.setAttribute("transform", `rotate(${tiltDeg}, ${CX}, ${CY + 15})`);
    haloGroup.appendChild(halo);
    svg.appendChild(haloGroup);

    /* ===== 2. 主地球圆底色 ===== */
    const bgCircle = document.createElementNS(ns, "circle");
    bgCircle.setAttribute("data-dynamic", "bg");
    bgCircle.setAttribute("cx", String(CX));
    bgCircle.setAttribute("cy", String(CY));
    bgCircle.setAttribute("r", String(R));
    bgCircle.setAttribute("fill", "#FAFAF8");
    bgCircle.setAttribute("stroke", "#E0E0DC");
    bgCircle.setAttribute("stroke-width", "1");
    svg.appendChild(bgCircle);

    /* ===== 3. 经纬线网格（随地球旋转）===== */
    const gridGroup = document.createElementNS(ns, "g");
    gridGroup.setAttribute("data-dynamic", "grid");

    /* 纬线 */
    for (let lat of [-60, -30, 0, 30, 60]) {
      const path = document.createElementNS(ns, "ellipse");
      const ry = Math.abs(Math.cos((lat * Math.PI) / 180)) * R * 0.55;
      path.setAttribute("cx", String(CX));
      path.setAttribute("cy", String(CY - R * Math.sin((lat * Math.PI) / 180) * 0.55));
      path.setAttribute("rx", String(R));
      path.setAttribute("ry", String(Math.max(ry, 1)));
      path.setAttribute("stroke", "#E0E0DC");
      path.setAttribute("stroke-width", lat === 0 ? "0.7" : "0.5");
      path.setAttribute("fill", "none");
      path.setAttribute("opacity", lat === 0 ? "0.4" : "0.25");
      gridGroup.appendChild(path);
    }

    /* 经线 — 随旋转偏移 */
    for (let i = 0; i < 6; i++) {
      const baseAngle = i * 30 + (rot % 30);
      const rx = Math.max(Math.abs(Math.cos((baseAngle * Math.PI) / 180)) * R, 1);
      const path = document.createElementNS(ns, "ellipse");
      path.setAttribute("cx", String(CX));
      path.setAttribute("cy", String(CY));
      path.setAttribute("rx", String(rx));
      path.setAttribute("ry", String(R * 0.55));
      path.setAttribute("stroke", "#E0E0DC");
      path.setAttribute("stroke-width", "0.5");
      path.setAttribute("fill", "none");
      path.setAttribute("opacity", String(0.2 + Math.abs(Math.sin((baseAngle * Math.PI) / 180)) * 0.15));

      /* 3D 倾斜变换模拟透视 */
      const skewFactor = Math.sin((baseAngle * Math.PI) / 180) * 0.3;
      path.setAttribute("transform", `matrix(${Math.cos(skewFactor)}, ${skewFactor * 0.2}, ${-skewFactor * 0.2}, ${Math.cos(skewFactor)}, ${CX * (1 - Math.cos(skewFactor))}, ${CY * (1 - Math.cos(skewFactor))})`);
      gridGroup.appendChild(path);
    }

    svg.appendChild(gridGroup);

    /* ===== 4. 陆地点阵（黑色点 = 陆地）===== */
    const dotsGroup = document.createElementNS(ns, "g");
    dotsGroup.setAttribute("data-dynamic", "dots");

    for (const pt of CONTINENT_POINTS) {
      const [lat, lng] = pt;
      const p = project(lat, lng, rot, R, CX, CY);
      if (p.z > 0.02) {
        /* 只绘制正面点 */
        const dot = document.createElementNS(ns, "circle");
        dot.setAttribute("cx", String(p.x));
        dot.setAttribute("cy", String(p.y));
        dot.setAttribute("r", "1.1");
        dot.setAttribute("fill", "#1a1a1a");

        /* 远近透明度：边缘淡出 */
        const alpha = 0.12 + p.z * 0.55;
        dot.setAttribute("opacity", String(Math.min(alpha, 0.7)));
        dotsGroup.appendChild(dot);
      }
    }
    svg.appendChild(dotsGroup);

    /* ===== 5. 连接节点和线路 ===== */
    const nodesGroup = document.createElementNS(ns, "g");
    nodesGroup.setAttribute("data-dynamic", "nodes");

    /* 定义节点位置（球面坐标），随旋转移动 */
    const nodeData = [
      { lat: 40, lng: 116 + rot * 0.05, color: "#3B82F6", r: 5 },   /* 北京附近 — 蓝色 */
      { lat: 23, lng: 113 + rot * 0.04, color: "#22C55E", r: 5 },   /* 广州附近 — 绿色 */
      { lat: 36, lng: 139 + rot * 0.06, color: "#F59E0B", r: 5 },   /* 东京附近 — 橙色 */
      { lat: -23, lng: -46 + rot * 0.03, color: "#1a1a1a", r: 4, opacity: 0.35 }, /* 圣保罗 */
      { lat: 52, lng: 0 + rot * 0.07, color: "#1a1a1a", r: 3.5, opacity: 0.25 },  /* 伦敦 */
    ];

    const projectedNodes = nodeData.map((n) => ({
      ...n,
      ...project(n.lat, n.lng, rot, R, CX, CY),
    }));

    /* 绘制连线 */
    const connections = [
      [0, 1], [1, 2], [0, 2], [2, 3], [1, 3], [1, 4],
    ];
    connections.forEach(([ai, bi]) => {
      const a = projectedNodes[ai];
      const b = projectedNodes[bi];
      if (a.z > -0.2 && b.z > -0.2) {
        const line = document.createElementNS(ns, "path");
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2 - 15; /* 弧线弯曲 */
        line.setAttribute(
          "d",
          `M${a.x} ${a.y} Q${midX} ${midY} ${b.x} ${b.y}`
        );
        line.setAttribute("stroke", "#1a1a1a");
        line.setAttribute("stroke-width", "1.2");
        line.setAttribute("fill", "none");
        line.setAttribute("opacity", String(Math.min(a.z, b.z) * 0.2 + 0.06));
        line.setAttribute("stroke-linecap", "round");
        nodesGroup.appendChild(line);
      }
    });

    /* 绘制节点 */
    projectedNodes.forEach((n) => {
      if (n.z > -0.3) {
        const opacityBase = n.opacity ?? 0.9;
        const op = n.z > 0 ? opacityBase : opacityBase * 0.3;

        /* 外发光 */
        const glow = document.createElementNS(ns, "circle");
        glow.setAttribute("cx", String(n.x));
        glow.setAttribute("cy", String(n.y));
        glow.setAttribute("r", String(n.r * 2));
        glow.setAttribute("fill", n.color);
        glow.setAttribute("opacity", String(op * 0.12));
        nodesGroup.appendChild(glow);

        /* 实心点 */
        const c = document.createElementNS(ns, "circle");
        c.setAttribute("cx", String(n.x));
        c.setAttribute("cy", String(n.y));
        c.setAttribute("r", String(n.r));
        c.setAttribute("fill", n.color);
        c.setAttribute("opacity", String(op));
        nodesGroup.appendChild(c);
      }
    });

    svg.appendChild(nodesGroup);

    /* ===== 6. 散布装饰点 ===== */
    const decoGroup = document.createElementNS(ns, "g");
    decoGroup.setAttribute("data-dynamic", "deco");
    const decoSeeds = [
      [165, 110], [240, 270], [148, 265], [260, 115], [180, 170],
      [220, 130], [130, 190], [270, 250], [155, 240], [230, 160],
    ];
    decoSeeds.forEach(([bx, by]) => {
      /* 让装饰点也微微浮动 */
      const ox = Math.sin(rot * 0.01 + bx) * 3;
      const oy = Math.cos(rot * 0.013 + by) * 3;
      const dc = document.createElementNS(ns, "circle");
      dc.setAttribute("cx", String(bx + ox));
      dc.setAttribute("cy", String(by + oy));
      dc.setAttribute("r", "2");
      dc.setAttribute("fill", "#1a1a1a");
      dc.setAttribute("opacity", String(0.08 + Math.sin(rot * 0.02 + bx + by) * 0.06));
      decoGroup.appendChild(dc);
    });
    svg.appendChild(decoGroup);
  };

  return (
    <div className="home-page" onMouseLeave={() => setMousePos({ x: -100, y: -100 })}>
      {/* ========== 自定义光标 — 圆环+中心黑点 ========== */}
      {!isOverTitle && (
        <div
          className="custom-cursor"
          style={{
            left: mousePos.x,
            top: mousePos.y,
          }}
        >
          <span className="custom-cursor-dot" />
        </div>
      )}

      {/* ========== 标题区悬停反转大球（mix-blend-mode 真正反转颜色）========== */}
      {isOverTitle && (
        <div
          className="cursor-invert-circle"
          style={{
            left: mousePos.x,
            top: mousePos.y,
          }}
        />
      )}

      {/* ============= HERO ============= */}
      <section className="home-hero">
        <div className="home-hero-inner">

          {/* ===== 左侧：装饰圆点 + 大标题 + CTA + 统计 ===== */}
          <div
            ref={titleRef}
            className="hero-left"
            onMouseEnter={() => setIsOverTitle(true)}
            onMouseLeave={() => setIsOverTitle(false)}
          >
            <h1 className="home-headline">
              <span className="home-headline-accent">悍匠</span>
            </h1>

            {/* 副标题已删除 */}

            <div className="home-actions">
              <a href={primaryHref} className="home-btn-cta">
                {userLabel}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <a href="/mobile" className="home-btn-ghost">
                手机端扫码
              </a>
            </div>

            {/* 统计数据条 —— 放在左侧底部，一屏内显示 */}
            {stats && (
              <div className="home-stats home-stats-inline">
                <div className="home-stat">
                  <strong>{stats.total}</strong>
                  <span>总台数</span>
                </div>
                <div className="home-stat-divider" />
                <div className="home-stat">
                  <strong>{stats.inStock}</strong>
                  <span>在库</span>
                </div>
                <div className="home-stat-divider" />
                <div className="home-stat">
                  <strong>{stats.checkedOut}</strong>
                  <span>已出库</span>
                </div>
                <div className="home-stat-divider" />
                <div className="home-stat">
                  <strong>{stats.pending}</strong>
                  <span>待处理</span>
                </div>
              </div>
            )}
          </div>

          {/* ===== 右侧：动态地球插图 ===== */}
          <div className="hero-right">
            <div className="hero-globe-container">
              <svg
                ref={globeSvgRef}
                viewBox="0 0 400 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: "100%", height: "100%" }}
              >
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.06" />
                    <stop offset="50%" stopColor="#1a1a1a" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.06" />
                  </linearGradient>
                </defs>
                {/* 动态内容由 JS 渲染 */}
              </svg>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
