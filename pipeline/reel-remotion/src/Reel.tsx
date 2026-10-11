// Zoomed Art reel, animated with Remotion.
// Camera framing, text wrapping and timing come from render.py (export_shots.py -> public/reel.json),
// so the rule "text never covers the detail" stays computed in one place. This file only animates.
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from "remotion";

type View = [number, number, number];
type Block = {lines: string[]; size: number; lh: number};
type Slide = {
  type: "cover" | "detail" | "cta";
  start: View;
  end: View;
  hold: number;
  move: number;
  textTop: number;
  map: [number, number, number, number] | null;
  focus: number[] | null;
  head?: Block;
  body?: Block;
  sub?: Block;
};
export type ReelData = {
  title: string; artist: string; year: string; fps: number; fmt: "reel" | "carousel"; bg: string;
  width: number; height: number; img: [number, number]; slides: Slide[];
  pad: number; brandY: number; safeTop: number; ctaHead: string; ctaSub: string; // platform safe zones, computed by render.py layout()
};

// Frame height: 1920 for the reel, 1350 for the carousel. Each composition renders in its own page,
// so it is set once at the top of Reel/Carousel before anything is drawn.
const W = 1080;
let H = 1920, PAD = 72;
const GOLD = "rgb(214,178,110)", WHITE = "rgb(245,240,230)", BODY = "rgb(232,226,214)";
const SERIF = "ZSerif, serif", SANS = "ZSans, sans-serif";
const MOVE_EASE = Easing.bezier(0.65, 0, 0.35, 1);
const OUT_FRAMES = 10; // text leaves during the last frames of a hold

export const totalFrames = (d: ReelData) => d.slides.reduce((n, s) => n + s.hold + s.move, 0);

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

// ---------- camera ----------
const lerpView = (a: View, b: View, t: number): View => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  Math.exp(Math.log(a[2]) + (Math.log(b[2]) - Math.log(a[2])) * t), // zoom evenly
];

// image px -> frame px for a camera
const camera = (v: View, img: [number, number]) => {
  const s = W / (v[2] * img[0]);
  const x0 = v[0] * img[0] - W / s / 2;
  const y0 = v[1] * img[1] - H / s / 2;
  return {s, x0, y0};
};

const focusRect = (focus: number[], img: [number, number], v: View) => {
  const {s, x0, y0} = camera(v, img);
  const bw = focus[2] * img[0];
  const bh = focus.length > 3 ? focus[3] * img[1] : bw * 0.62;
  return {x: (focus[0] * img[0] - bw / 2 - x0) * s, y: (focus[1] * img[1] - bh / 2 - y0) * s, w: bw * s, h: bh * s};
};

// where we are on the timeline: which slide, and in its hold or in the move after it
const locate = (d: ReelData, frame: number) => {
  let f0 = 0;
  for (let i = 0; i < d.slides.length; i++) {
    const s = d.slides[i];
    if (frame < f0 + s.hold) return {i, k: frame - f0, moving: false, f0};
    if (frame < f0 + s.hold + s.move) return {i, k: frame - f0 - s.hold, moving: true, f0};
    f0 += s.hold + s.move;
  }
  const i = d.slides.length - 1;
  return {i, k: d.slides[i].hold - 1, moving: false, f0: f0 - d.slides[i].hold};
};

// ---------- layers ----------
const Painting: React.FC<{v: View; img: [number, number]; bg: string}> = ({v, img, bg}) => {
  const {s, x0, y0} = camera(v, img);
  return (
    <AbsoluteFill>
      <Img src={staticFile(bg)} style={{width: W, height: H}} />
      <Img
        src={staticFile("painting.jpg")}
        style={{
          position: "absolute", left: 0, top: 0, width: img[0], height: img[1], maxWidth: "none",
          transformOrigin: "0 0", transform: `translate(${-x0 * s}px, ${-y0 * s}px) scale(${s})`,
        }}
      />
    </AbsoluteFill>
  );
};

// dark at the bottom from just above the text, same curve as render.py gradient()
const Shades: React.FC<{textTop: number | null; alpha: number}> = ({textTop, alpha}) => {
  const stops: string[] = [];
  if (textTop !== null) {
    const start = Math.max(0.3, Math.round(((textTop - 220) / H) * 100) / 100);
    for (let n = 0; n <= 10; n++) {
      const t = n / 10;
      const a = (235 / 255) * Math.pow(Math.min(1, t * 1.6), 1.2);
      stops.push(`rgba(12,11,10,${a.toFixed(3)}) ${((start + (1 - start) * t) * 100).toFixed(1)}%`);
    }
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: "radial-gradient(ellipse 85% 70% at 50% 45%, transparent 60%, rgba(0,0,0,0.28) 100%)"}} />
      <AbsoluteFill style={{background: "linear-gradient(rgba(12,11,10,0.59), rgba(12,11,10,0) 220px)"}} />
      {textTop !== null && <AbsoluteFill style={{opacity: alpha, background: `linear-gradient(rgba(12,11,10,0) 0%, ${stops.join(", ")})`}} />}
    </AbsoluteFill>
  );
};

// story-style progress bar: tells the viewer how far along they are
const Progress: React.FC<{d: ReelData; frame: number}> = ({d, frame}) => {
  const n = d.slides.length, gap = 8, segW = (W - 2 * PAD - gap * (n - 1)) / n; // inside the safe zone
  let f0 = 0;
  return (
    <>
      {d.slides.map((s, i) => {
        const len = s.hold + s.move;
        const p = interpolate(frame, [f0, f0 + len], [0, 1], clamp);
        f0 += len;
        return (
          <div key={i} style={{position: "absolute", top: d.brandY - 22, left: PAD + i * (segW + gap), width: segW, height: 4, borderRadius: 2, background: "rgba(245,240,230,0.28)", overflow: "hidden"}}>
            <div style={{width: `${p * 100}%`, height: "100%", background: GOLD}} />
          </div>
        );
      })}
    </>
  );
};

const Brand: React.FC<{top: number; counter?: string}> = ({top, counter}) => (
  <>
    <div style={{position: "absolute", top, left: PAD, font: `700 26px ${SANS}`, letterSpacing: 4, color: "rgba(214,178,110,0.9)", lineHeight: "30px"}}>ZOOMED ART</div>
    {counter && <div style={{position: "absolute", top, right: PAD, font: `700 26px ${SANS}`, color: "rgba(245,240,230,0.8)", lineHeight: "30px"}}>{counter}</div>}
  </>
);

// soft spotlight + gold corner brackets that draw themselves around the detail
const Highlight: React.FC<{r: {x: number; y: number; w: number; h: number}; k: number; out: number}> = ({r, k, out}) => {
  const p = 22; // breathing room around the detail
  const x = r.x - p, y = r.y - p, w = r.w + 2 * p, h = r.h + 2 * p;
  const dim = interpolate(k, [12, 40], [0, 0.5], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)}) * out;
  const draw = interpolate(k, [18, 40], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const settle = interpolate(k, [18, 44], [1.06, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const glow = 0.55 + 0.45 * Math.sin((k / 30) * Math.PI * 0.9); // slow breathing glow
  const L = Math.max(34, Math.min(90, 0.22 * Math.min(w, h)));
  const cx = x + w / 2, cy = y + h / 2;
  const corners = [
    `M ${x} ${y + L} L ${x} ${y} L ${x + L} ${y}`,
    `M ${x + w - L} ${y} L ${x + w} ${y} L ${x + w} ${y + L}`,
    `M ${x + w} ${y + h - L} L ${x + w} ${y + h} L ${x + w - L} ${y + h}`,
    `M ${x + L} ${y + h} L ${x} ${y + h} L ${x} ${y + h - L}`,
  ];
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{position: "absolute"}}>
        <defs>
          <filter id="feather" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="28" /></filter>
          <mask id="hole">
            <rect width={W} height={H} fill="white" />
            <rect x={x} y={y} width={w} height={h} rx={18} fill="black" filter="url(#feather)" />
          </mask>
        </defs>
        <rect width={W} height={H} fill="black" opacity={dim} mask="url(#hole)" />
        <g style={{transformOrigin: `${cx}px ${cy}px`, scale: String(settle), opacity: out}}>
          {corners.map((c, i) => (
            <path key={i} d={c} fill="none" stroke={GOLD} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw}
              style={{filter: `drop-shadow(0 0 ${6 + 8 * glow}px rgba(214,178,110,${0.35 + 0.35 * glow}))`}} />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// tiny details (a ship on the horizon) get a slow gold ripple on the spot itself
const Pulse: React.FC<{x: number; y: number; k: number; out: number}> = ({x, y, k, out}) => {
  if (k < 40) return null;
  const t = ((k - 40) % 45) / 45;
  const p = Easing.bezier(0.16, 1, 0.3, 1)(t);
  const R = 30 + 80 * p;
  return (
    <div style={{position: "absolute", left: x - R, top: y - R, width: 2 * R, height: 2 * R, borderRadius: "50%",
      border: `3px solid ${GOLD}`, opacity: (1 - t) * 0.9 * out, boxShadow: "0 0 18px rgba(214,178,110,0.6)"}} />
  );
};

// words with a digit (147, 13 days, 1816) turn gold: the numbers are the hook
const Word: React.FC<{w: string; k: number; delay: number; color: string}> = ({w, k, delay, color}) => {
  const p = interpolate(k, [delay, delay + 16], [0, 1], {...clamp, easing: Easing.spring({damping: 200})});
  return (
    <span style={{display: "inline-block", opacity: p, translate: `0px ${(1 - p) * 26}px`, filter: `blur(${(1 - p) * 6}px)`, color: /\d/.test(w) ? GOLD : color, whiteSpace: "pre"}}>
      {w}
    </span>
  );
};

const Headline: React.FC<{b: Block; top: number; k: number; start: number}> = ({b, top, k, start}) => {
  let n = 0;
  return (
    <div style={{position: "absolute", left: PAD, top, font: `700 ${b.size}px ${SERIF}`, lineHeight: `${b.lh}px`, color: WHITE, textShadow: "0 2px 18px rgba(0,0,0,0.45)"}}>
      {b.lines.map((line, li) => (
        <div key={li} style={{whiteSpace: "nowrap"}}>
          {line.split(" ").map((w, wi, arr) => <Word key={wi} w={w + (wi < arr.length - 1 ? " " : "")} k={k} delay={start + 2.5 * n++} color={WHITE} />)}
        </div>
      ))}
    </div>
  );
};

const Lines: React.FC<{b: Block; top: number; k: number; start: number; font: string; color: string}> = ({b, top, k, start, font, color}) => (
  <div style={{position: "absolute", left: PAD, top, font: `${font} ${b.size}px ${font.includes("italic") ? SERIF : SANS}`, lineHeight: `${b.lh}px`, color}}>
    {b.lines.map((line, li) => {
      const p = interpolate(k, [start + 4 * li, start + 4 * li + 16], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
      return (
        <div key={li} style={{whiteSpace: "nowrap", opacity: p, translate: `0px ${(1 - p) * 16}px`}}>
          {line.split(/(\S*\d\S*)/).map((part, pi) => <span key={pi} style={{color: /\d/.test(part) ? GOLD : undefined}}>{part}</span>)}
        </div>
      );
    })}
  </div>
);

const MiniMap: React.FC<{m: [number, number, number, number]; v: View; img: [number, number]; k: number; out: number}> = ({m, v, img, k, out}) => {
  const [mx, my, mw, mh] = m;
  const kk = (mw - 6) / img[0];
  const vw = v[2] * img[0], vh = vw * (H / W);
  const x0 = v[0] * img[0] - vw / 2, y0 = v[1] * img[1] - vh / 2;
  const rx = Math.max(0, x0 * kk), ry = Math.max(0, y0 * kk);
  const rw = Math.min(mw - 7, (x0 + vw) * kk) - rx, rh = Math.min(mh - 7, (y0 + vh) * kk) - ry;
  const p = interpolate(k, [6, 22], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  return (
    <div style={{position: "absolute", left: mx, top: my, width: mw, height: mh, background: WHITE, padding: 3, boxSizing: "border-box", opacity: 0.92 * p * out, translate: `${(1 - p) * 24}px 0px`, boxShadow: "0 6px 24px rgba(0,0,0,0.45)"}}>
      <div style={{position: "relative", width: mw - 6, height: mh - 6}}>
        <Img src={staticFile("thumb.jpg")} style={{width: "100%", height: "100%", display: "block"}} />
        <div style={{position: "absolute", left: rx, top: ry, width: rw, height: rh, border: `3px solid ${GOLD}`, boxSizing: "border-box"}} />
      </div>
    </div>
  );
};

const SlideText: React.FC<{d: ReelData; s: Slide; k: number; v: View}> = ({d, s, k, v}) => {
  const out = s.hold ? interpolate(k, [s.hold - OUT_FRAMES, s.hold], [1, 0], clamp) : 1; // carousel: no exit
  const lift = (1 - out) * -12;
  // Reel cover is fully visible from frame 0 (same design as carousel slide 1), so the platforms
  // pick it as the thumbnail (Alex, 2026-10-10). Its text skips the word-by-word reveal.
  if (d.fmt === "reel" && s.type === "cover") k += 120;
  if (s.type === "cta") {
    const p = interpolate(k, [0, 22], [0, 1], {...clamp, easing: Easing.spring({damping: 200})});
    const sub = interpolate(k, [14, 32], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
    const line = interpolate(k, [24, 46], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
    // final slide: headline, then the "why", then the follow line in gold (text from render.py CTA_HEAD / CTA_SUB)
    const cy = H / 2 - (d.fmt === "reel" ? 110 : 0); // reel: keep clear of the like/share column
    const [why, follow] = d.ctaSub.includes("Follow") ? [d.ctaSub.slice(0, d.ctaSub.indexOf("Follow")).trim(), d.ctaSub.slice(d.ctaSub.indexOf("Follow"))] : [d.ctaSub, ""];
    const block = {position: "absolute", left: (W - 860) / 2, width: 860, textAlign: "center"} as const;
    const followP = interpolate(k, [30, 50], [0, 1], {...clamp, easing: Easing.spring({damping: 200})});
    return (
      <AbsoluteFill>
        <div style={{...block, top: cy - 300, font: `700 72px ${SERIF}`, lineHeight: "84px", color: WHITE, opacity: p, scale: String(0.94 + 0.06 * p)}}>
          {d.ctaHead}
        </div>
        <div style={{position: "absolute", top: cy - 110, left: W / 2 - 60 * line, width: 120 * line, height: 3, background: GOLD, borderRadius: 2}} />
        <div style={{...block, top: cy - 80, font: `italic 400 42px ${SERIF}`, lineHeight: "52px", color: "rgba(245,240,230,0.85)", opacity: sub, translate: `0px ${(1 - sub) * 14}px`}}>{why}</div>
        {follow && (
          <div style={{...block, top: cy + 10, font: `700 60px ${SERIF}`, color: GOLD, opacity: followP, scale: String(0.9 + 0.1 * followP)}}>
            {follow}
          </div>
        )}
        <div style={{...block, top: cy + 110, font: `400 26px ${SANS}`, color: "rgba(245,240,230,0.7)", opacity: sub}}>
          {d.title} · {d.artist}, {d.year}
        </div>
      </AbsoluteFill>
    );
  }
  const head = s.head!;
  const words = head.lines.join(" ").split(" ").length;
  const headEnd = 4 + 2.5 * words + 10;
  const bar = interpolate(k, [headEnd - 6, headEnd + 10], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const headH = head.lines.length * head.lh;
  return (
    <AbsoluteFill style={{opacity: out, translate: `0px ${lift}px`}}>
      {s.type === "cover" ? (
        <>
          <Headline b={head} top={s.textTop} k={k} start={4} />
          <div style={{position: "absolute", left: PAD, top: s.textTop + headH + 18, width: 90 * bar, height: 5, background: GOLD}} />
          <Lines b={s.sub!} top={s.textTop + headH + 45} k={k} start={headEnd} font="italic 400" color={GOLD} />
          {d.fmt === "carousel" && <div style={{position: "absolute", right: PAD, top: H - 80, font: `400 26px ${SANS}`, color: "rgba(245,240,230,0.8)"}}>Swipe to zoom in  →</div>}
        </>
      ) : (
        <>
          <div style={{position: "absolute", left: PAD, top: s.textTop - 22, width: 70 * bar, height: 4, background: GOLD, borderRadius: 2}} />
          <Headline b={head} top={s.textTop} k={k} start={4} />
          <Lines b={s.body!} top={s.textTop + headH + 28} k={k} start={headEnd - 4} font="400" color={BODY} />
          {s.map && <MiniMap m={s.map} v={v} img={d.img} k={k} out={out} />}
        </>
      )}
    </AbsoluteFill>
  );
};

const Shot: React.FC<{d: ReelData; i: number; k: number; v: View; moving: boolean; pulseK?: number}> = ({d, i, k, v, moving, pulseK}) => {
  const s = d.slides[i];
  // highlight every detail except "whole painting" slides; keep the brackets inside the frame, below the brand bar
  const raw = !moving && s.type === "detail" && s.focus && s.focus[2] < 0.9 ? focusRect(s.focus, d.img, v) : null;
  const top = d.fmt === "reel" ? d.safeTop : 130;
  const r = raw && (() => {
    const x = Math.max(raw.x, 60), y = Math.max(raw.y, top); // phones crop ~47 px per side
    return {x, y, w: Math.min(raw.x + raw.w, W - 60) - x, h: Math.min(raw.y + raw.h, s.textTop - 50) - y};
  })();
  const out = s.hold ? interpolate(k, [s.hold - OUT_FRAMES, s.hold], [1, 0], clamp) : 1;
  const shade = !s.hold ? 1 : s.type === "cover" ? out : Math.min(out, interpolate(k, [0, 8], [0, 1], clamp));
  return (
    <>
      <Painting v={v} img={d.img} bg={d.bg} />
      {!moving && s.type === "cta" && <AbsoluteFill style={{background: "rgba(12,11,10,0.72)"}} />}
      {r && <Highlight r={r} k={k} out={out} />}
      {raw && s.focus![2] < 0.12 && <Pulse x={raw.x + raw.w / 2} y={raw.y + raw.h / 2} k={pulseK ?? k} out={out} />}
      <Shades textTop={!moving && s.type !== "cta" ? s.textTop : null} alpha={shade} />
      {!moving && <SlideText d={d} s={s} k={k} v={v} />}
    </>
  );
};

export const Reel: React.FC<{data: ReelData}> = ({data: d}) => {
  H = d.height; PAD = d.pad;
  const frame = useCurrentFrame();
  const {i, k, moving} = locate(d, frame);
  const s = d.slides[i];
  const v = moving
    ? lerpView(s.end, d.slides[i + 1].start, MOVE_EASE(Math.min(1, k / Math.max(1, s.move - 1))))
    : lerpView(s.start, s.end, k / Math.max(1, s.hold - 1)); // slow push-in
  return (
    <AbsoluteFill style={{backgroundColor: "rgb(12,11,10)"}}>
      <Shot d={d} i={i} k={k} v={v} moving={moving} />
      <Progress d={d} frame={frame} />
      <Brand top={d.brandY} />
    </AbsoluteFill>
  );
};

// one frame per carousel slide, every animation in its finished state
export const Carousel: React.FC<{data: ReelData}> = ({data: d}) => {
  H = d.height; PAD = d.pad;
  const i = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: "rgb(12,11,10)"}}>
      <Shot d={d} i={i} k={120} v={d.slides[i].end} moving={false} pulseK={55} />
      <Brand top={58} counter={`${i + 1}/${d.slides.length}`} />
    </AbsoluteFill>
  );
};
