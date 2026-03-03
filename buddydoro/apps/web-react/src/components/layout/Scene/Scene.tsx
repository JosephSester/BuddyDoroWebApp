import { useRef, useEffect, useMemo } from 'react';
import { useSceneStore } from '../../../stores/sceneStore';
import { useCompanionStore, COMPANION_THEMES } from '../../../stores/companionStore';
import styles from './Scene.module.css';

// ── Deterministic random helpers ────────────────────────
function seeded(n: number) { return ((n * 2654435761) >>> 0) / 0xffffffff; }

// ── Static data (generated once) ────────────────────────
const STARS = Array.from({ length: 55 }, (_, i) => ({
  id: i, top: seeded(i * 7) * 60, left: seeded(i * 13) * 100,
  size: seeded(i * 3) * 2 + 0.8, delay: seeded(i * 5) * 4,
}));

const FIREFLIES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  top: 25 + seeded(i * 11) * 50,
  left: seeded(i * 17) * 90,
  size: seeded(i * 7) * 4 + 3,
  duration: 4 + seeded(i * 9) * 6,
  delay: seeded(i * 3) * 5,
  glowDur: 1.5 + seeded(i * 19) * 2,
}));

const CLOUDS = [
  { id: 0, top: 8,  width: 120, height: 38, animName: 'driftCloud1', dur: 55, delay: 0    },
  { id: 1, top: 16, width: 90,  height: 28, animName: 'driftCloud2', dur: 70, delay: -22  },
  { id: 2, top: 5,  width: 150, height: 44, animName: 'driftCloud3', dur: 90, delay: -40  },
  { id: 3, top: 22, width: 75,  height: 24, animName: 'driftCloud1', dur: 65, delay: -30  },
];

// ── Particle configs per type ────────────────────────────
interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; rotation: number; rotSpeed: number;
  r: number; g: number; b: number; a: number;
  wobble: number; wobbleSpeed: number; wobbleAmt: number;
}

function makeParticle(type: 'leaves' | 'petals' | 'snow', i: number, w: number): Particle {
  const s = seeded;
  const x = s(i * 13) * w;
  const y = -(s(i * 7) * 300);
  const wobble = s(i * 3) * Math.PI * 2;

  if (type === 'leaves') {
    const colors = [[198,98,42],[165,75,25],[210,130,30],[140,60,20],[180,100,40]];
    const c = colors[i % colors.length];
    return { x, y, vx: (s(i*17)-0.5)*0.6, vy: 0.8 + s(i*11)*0.8,
             size: 5+s(i*5)*5, rotation: s(i*19)*360, rotSpeed: (s(i*23)-0.5)*3,
             r:c[0], g:c[1], b:c[2], a:0.75+s(i*29)*0.2,
             wobble, wobbleSpeed: 0.02+s(i*31)*0.02, wobbleAmt: 1.5+s(i*37)*2 };
  }
  if (type === 'petals') {
    const colors = [[140,190,100],[100,160,70],[120,200,80],[160,210,120]];
    const c = colors[i % colors.length];
    return { x, y, vx: (s(i*17)-0.5)*0.5, vy: 0.5 + s(i*11)*0.6,
             size: 4+s(i*5)*4, rotation: s(i*19)*360, rotSpeed: (s(i*23)-0.5)*2,
             r:c[0], g:c[1], b:c[2], a:0.65+s(i*29)*0.25,
             wobble, wobbleSpeed: 0.015+s(i*31)*0.02, wobbleAmt: 2+s(i*37)*2 };
  }
  // snow
  return { x, y, vx: (s(i*17)-0.5)*0.4, vy: 0.6 + s(i*11)*0.7,
           size: 2+s(i*5)*4, rotation: 0, rotSpeed: 0,
           r:230, g:240, b:255, a:0.65+s(i*29)*0.30,
           wobble, wobbleSpeed: 0.03+s(i*31)*0.02, wobbleAmt: 1+s(i*37)*1.5 };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, type: 'leaves' | 'petals' | 'snow') {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha = p.a;

  if (type === 'snow') {
    ctx.beginPath();
    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
    ctx.fill();
  } else if (type === 'petals') {
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
    ctx.fill();
  } else {
    // leaf — oval with rotation
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.38, p.size * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
    ctx.fill();
    // vein
    ctx.beginPath();
    ctx.moveTo(0, -p.size * 0.5);
    ctx.lineTo(0, p.size * 0.5);
    ctx.strokeStyle = `rgba(${Math.max(0,p.r-40)},${Math.max(0,p.g-30)},${Math.max(0,p.b-20)},0.4)`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

// ── Tree components ──────────────────────────────────────
function AutumnTrees({ isNight }: { isNight: boolean }) {
  const canopyColor = isNight
    ? ['#3d1f08','#4a2810','#351808']
    : ['#c05020','#a03818','#d07030','#8a2810','#b84020'];
  const trunkColor = isNight ? '#2a1206' : '#5a3010';
  const trees = [
    { left: '2%',  h: 130, cw: 90,  ch: 100, ci: 0 },
    { left: '10%', h: 90,  cw: 65,  ch: 75,  ci: 1 },
    { left: '78%', h: 120, cw: 85,  ch: 95,  ci: 2 },
    { left: '88%', h: 100, cw: 70,  ch: 80,  ci: 3 },
    { left: '93%', h: 75,  cw: 55,  ch: 65,  ci: 4 },
  ];
  return (
    <>
      {trees.map((t, i) => (
        <div key={i} className={styles.treeWrap}
          style={{ left: t.left, animationDuration: `${3.5 + i * 0.7}s`, animationDelay: `${i * 0.4}s` }}>
          <div className={styles.oakCanopy}
            style={{ width: t.cw, height: t.ch, background: canopyColor[t.ci % canopyColor.length] }} />
          <div className={styles.oakTrunk} style={{ height: t.h * 0.35, background: trunkColor }} />
        </div>
      ))}
    </>
  );
}

function WoodlandTrees({ isNight }: { isNight: boolean }) {
  const treeColor = isNight
    ? ['#0e2810','#122e12','#0a2208']
    : ['#2a5c1a','#1e4a12','#366624','#244e18'];
  const trunkColor = isNight ? '#0a1808' : '#3a2810';
  const trees = [
    { left: '0%',  h: 180, bw: 70,  ci: 0 },
    { left: '6%',  h: 140, bw: 52,  ci: 1 },
    { left: '14%', h: 160, bw: 60,  ci: 2 },
    { left: '74%', h: 170, bw: 65,  ci: 3 },
    { left: '82%', h: 150, bw: 55,  ci: 0 },
    { left: '90%', h: 190, bw: 72,  ci: 1 },
  ];
  return (
    <>
      {trees.map((t, i) => (
        <div key={i} className={styles.treeWrap}
          style={{ left: t.left, animationDuration: `${4 + i * 0.6}s`, animationDelay: `${i * 0.3}s` }}>
          {/* pine layers */}
          <div style={{ position:'relative', width: t.bw + 20, margin:'0 auto' }}>
            <div className={styles.pineLayer}
              style={{ borderLeftWidth: t.bw*0.35, borderRightWidth: t.bw*0.35,
                       borderBottomWidth: t.bw*0.55, borderBottomColor: treeColor[t.ci % treeColor.length] }} />
            <div className={styles.pineLayer}
              style={{ borderLeftWidth: t.bw*0.45, borderRightWidth: t.bw*0.45,
                       borderBottomWidth: t.bw*0.65, borderBottomColor: treeColor[t.ci % treeColor.length],
                       marginTop: -t.bw*0.25 }} />
            <div className={styles.pineLayer}
              style={{ borderLeftWidth: t.bw*0.5, borderRightWidth: t.bw*0.5,
                       borderBottomWidth: t.bw*0.7, borderBottomColor: treeColor[(t.ci+1)%treeColor.length],
                       marginTop: -t.bw*0.3 }} />
          </div>
          <div className={styles.pineTrunk} style={{ height: t.h * 0.2, background: trunkColor }} />
        </div>
      ))}
    </>
  );
}

function WinterTrees({ isNight }: { isNight: boolean }) {
  const trunkColor = isNight ? '#0d1520' : '#4a6070';
  const snowColor = 'rgba(225,240,255,0.85)';
  const trees = [
    { left: '1%',  h: 110 },
    { left: '8%',  h: 85  },
    { left: '76%', h: 100 },
    { left: '85%', h: 130 },
    { left: '92%', h: 90  },
  ];
  return (
    <>
      {trees.map((t, i) => (
        <div key={i} className={styles.treeWrap}
          style={{ left: t.left, animationDuration: `${4.5 + i * 0.5}s`, animationDelay: `${i * 0.5}s` }}>
          {/* bare branching structure via SVG */}
          <svg width="60" height={t.h} viewBox={`0 0 60 ${t.h}`} style={{ display:'block', margin:'0 auto' }}>
            {/* trunk */}
            <rect x="27" y={t.h * 0.55} width="6" height={t.h * 0.45} rx="3" fill={trunkColor} />
            {/* main branches */}
            <line x1="30" y1={t.h*0.55} x2="10" y2={t.h*0.25} stroke={trunkColor} strokeWidth="3.5" strokeLinecap="round"/>
            <line x1="30" y1={t.h*0.55} x2="50" y2={t.h*0.25} stroke={trunkColor} strokeWidth="3.5" strokeLinecap="round"/>
            <line x1="30" y1={t.h*0.4}  x2="8"  y2={t.h*0.15} stroke={trunkColor} strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="30" y1={t.h*0.4}  x2="52" y2={t.h*0.15} stroke={trunkColor} strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="30" y1={t.h*0.28} x2="18" y2={t.h*0.05} stroke={trunkColor} strokeWidth="2" strokeLinecap="round"/>
            <line x1="30" y1={t.h*0.28} x2="42" y2={t.h*0.05} stroke={trunkColor} strokeWidth="2" strokeLinecap="round"/>
            {/* snow caps on branches */}
            <ellipse cx="10" cy={t.h*0.24} rx="7" ry="3" fill={snowColor}/>
            <ellipse cx="50" cy={t.h*0.24} rx="7" ry="3" fill={snowColor}/>
            <ellipse cx="8"  cy={t.h*0.14} rx="6" ry="2.5" fill={snowColor}/>
            <ellipse cx="52" cy={t.h*0.14} rx="6" ry="2.5" fill={snowColor}/>
          </svg>
        </div>
      ))}
    </>
  );
}

function GrassTufts({ scene, isNight }: { scene: string; isNight: boolean }) {
  if (scene === 'winter') return null;
  const color = scene === 'woodland'
    ? (isNight ? '#0e2010' : '#2a5020')
    : (isNight ? '#2a1008' : '#6a3818');
  const positions = [15, 22, 35, 45, 55, 65, 72, 80];
  return (
    <>
      {positions.map((left, i) => (
        <div key={i} className={styles.grass}
          style={{ left: `${left}%`, animationDuration: `${2+i*0.3}s`, animationDelay: `${i*0.25}s` }}>
          {[10,14,10].map((h, j) => (
            <div key={j} className={styles.grassBlade}
              style={{ width: 5, height: h, background: color }} />
          ))}
        </div>
      ))}
    </>
  );
}

// ── Main Scene component ─────────────────────────────────
export function Scene() {
  const { isNight } = useSceneStore();
  const { companionType } = useCompanionStore();
  const theme = COMPANION_THEMES[companionType];
  const scene = theme.scene;
  const particleType = theme.particleType;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  // Build particles once per theme change
  const PARTICLE_COUNT = particleType === 'snow' ? 100 : 55;
  useMemo(() => {
    const w = window.innerWidth;
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, (_, i) =>
      makeParticle(particleType, i, w)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleType]);

  // Particle animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function tick() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particlesRef.current) {
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * p.wobbleAmt;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
          p.wobble = Math.random() * Math.PI * 2;
        }
        drawParticle(ctx, p, particleType);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [particleType]);

  const bgClass = `${scene}-${isNight ? 'night' : 'day'}`;
  const groundClass = `${scene}-${isNight ? 'night' : 'day'}`;
  const cloudType = scene;
  const sunClass = `${scene}-sun`;

  return (
    <div className={styles.scene}>
      {/* Background gradient */}
      <div className={`${styles.bg} ${styles[bgClass]}`} />

      {/* Fog (woodland only) */}
      <div className={`${styles.fog} ${scene === 'woodland' ? styles.visible : ''}`} />

      {/* Stars */}
      <div className={`${styles.stars} ${isNight ? styles.visible : ''}`}>
        {STARS.map(s => (
          <div key={s.id} className={styles.star}
            style={{ top:`${s.top}%`, left:`${s.left}%`, width:s.size, height:s.size, animationDelay:`${s.delay}s` }} />
        ))}
      </div>

      {/* Moon */}
      <div className={`${styles.moon} ${isNight ? styles.visible : ''}`} />

      {/* Sun */}
      <div className={`${styles.sun} ${styles[sunClass]} ${!isNight ? styles.visible : ''}`} />

      {/* Clouds (day only) */}
      <div className={`${styles.clouds} ${!isNight ? styles.visible : ''}`}>
        {CLOUDS.map(c => (
          <div key={c.id} className={`${styles.cloud} ${styles[cloudType]}`}
            style={{
              top: `${c.top}%`,
              width: c.width,
              height: c.height,
              animation: `${c.animName} ${c.dur}s linear ${c.delay}s infinite`,
            }}>
            <div style={{
              position:'absolute', top: -c.height*0.45, left: c.width*0.15,
              width: c.height*0.85, height: c.height*0.85, borderRadius:'50%',
              background: 'inherit',
            }} />
            <div style={{
              position:'absolute', top: -c.height*0.3, left: c.width*0.45,
              width: c.height*0.7, height: c.height*0.7, borderRadius:'50%',
              background: 'inherit',
            }} />
          </div>
        ))}
      </div>

      {/* Fireflies (night only) */}
      <div className={`${styles.fireflies} ${isNight ? styles.visible : ''}`}>
        {FIREFLIES.map(f => (
          <div key={f.id} className={`${styles.firefly} ${styles[scene]}`}
            style={{
              top: `${f.top}%`, left: `${f.left}%`,
              width: f.size, height: f.size,
              animation: `fireflyFloat ${f.duration}s ease-in-out ${f.delay}s infinite,
                           fireflyGlow ${f.glowDur}s ease-in-out ${f.delay*0.5}s infinite alternate`,
            }} />
        ))}
      </div>

      {/* Falling particles canvas */}
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      {/* Ground */}
      <div className={`${styles.ground} ${styles[groundClass]}`}>
        {scene === 'winter' && (
          <div className={`${styles.snowGround} ${styles.visible}`} />
        )}
      </div>

      {/* Trees */}
      <div className={styles.trees}>
        {scene === 'autumn'   && <AutumnTrees  isNight={isNight} />}
        {scene === 'woodland' && <WoodlandTrees isNight={isNight} />}
        {scene === 'winter'   && <WinterTrees  isNight={isNight} />}
        <GrassTufts scene={scene} isNight={isNight} />
      </div>
    </div>
  );
}
