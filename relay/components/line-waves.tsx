'use client';
import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

export type LineWavesProps = {
  speed?: number; innerLineCount?: number; outerLineCount?: number; warpIntensity?: number;
  rotation?: number; edgeFadeWidth?: number; colorCycleSpeed?: number; brightness?: number;
  color1?: string; color2?: string; color3?: string;
  enableMouseInteraction?: boolean; mouseInfluence?: number; paused?: boolean;
};

const hexToVec3 = (hex: string) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
};

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0, 1); }
`;

const fragmentShader = `
precision highp float;
uniform float uTime; uniform vec3 uResolution; uniform float uSpeed;
uniform float uInnerLines; uniform float uOuterLines; uniform float uWarpIntensity;
uniform float uRotation; uniform float uEdgeFadeWidth; uniform float uColorCycleSpeed;
uniform float uBrightness; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3;
uniform vec2 uMouse; uniform float uMouseInfluence; uniform bool uEnableMouse;
#define HALF_PI 1.5707963
float hashF(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
float smoothNoise(float x) {
  float i = floor(x); float f = fract(x); float u = f * f * (3.0 - 2.0 * f);
  return mix(hashF(i), hashF(i + 1.0), u);
}
float displaceA(float c, float t) {
  float r = sin(c * 2.123) * 0.2; r += sin(c * 3.234 + t * 4.345) * 0.1; r += sin(c * 0.589 + t * 0.934) * 0.5; return r;
}
float displaceB(float c, float t) {
  float r = sin(c * 1.345) * 0.3; r += sin(c * 2.734 + t * 3.345) * 0.2; r += sin(c * 0.189 + t * 0.934) * 0.3; return r;
}
vec2 rotate2D(vec2 p, float a) { float c = cos(a); float s = sin(a); return vec2(p.x * c - p.y * s, p.x * s + p.y * c); }
void main() {
  vec2 coords = gl_FragCoord.xy / uResolution.xy;
  coords = coords * 2.0 - 1.0;
  coords = rotate2D(coords, uRotation);
  float halfT = uTime * uSpeed * 0.5;
  float fullT = uTime * uSpeed;
  float mouseWarp = 0.0;
  if (uEnableMouse) {
    vec2 mPos = rotate2D(uMouse * 2.0 - 1.0, uRotation);
    float mDist = length(coords - mPos);
    mouseWarp = uMouseInfluence * exp(-mDist * mDist * 4.0);
  }
  float warpAx = coords.x + displaceA(coords.y, halfT) * uWarpIntensity + mouseWarp;
  float warpAy = coords.y - displaceA(coords.x * cos(fullT) * 1.235, halfT) * uWarpIntensity;
  float warpBx = coords.x + displaceB(coords.y, halfT) * uWarpIntensity + mouseWarp;
  float warpBy = coords.y - displaceB(coords.x * sin(fullT) * 1.235, halfT) * uWarpIntensity;
  vec2 fieldA = vec2(warpAx, warpAy);
  vec2 fieldB = vec2(warpBx, warpBy);
  vec2 blended = mix(fieldA, fieldB, mix(fieldA, fieldB, 0.5));
  float fadeTop = smoothstep(uEdgeFadeWidth, uEdgeFadeWidth + 0.4, blended.y);
  float fadeBottom = 1.0 - smoothstep(-uEdgeFadeWidth - 0.4, -uEdgeFadeWidth, blended.y);
  float vMask = 1.0 - max(fadeTop, fadeBottom);
  float tileCount = mix(uOuterLines, uInnerLines, vMask);
  float scaledY = blended.y * tileCount;
  float nY = smoothNoise(abs(scaledY));
  float ridge = pow(max(0.0, step(abs(nY - blended.x) * 2.0, HALF_PI) * cos(2.0 * (nY - blended.x))), 5.0);
  float lines = 0.0;
  for (float i = 1.0; i < 3.0; i += 1.0) { lines += pow(max(fract(scaledY), fract(-scaledY)), i * 2.0); }
  float pattern = vMask * lines;
  float cycleT = fullT * uColorCycleSpeed;
  float rC = (pattern + lines * ridge) * (cos(blended.y + cycleT * 0.234) * 0.5 + 1.0);
  float gC = (pattern + vMask * ridge) * (sin(blended.x + cycleT * 1.745) * 0.5 + 1.0);
  float bC = (pattern + lines * ridge) * (cos(blended.x + cycleT * 0.534) * 0.5 + 1.0);
  vec3 col = (rC * uColor1 + gC * uColor2 + bC * uColor3) * uBrightness;
  gl_FragColor = vec4(col, clamp(length(col), 0.0, 1.0));
}
`;

export default function LineWaves({
  speed = 0.3, innerLineCount = 32, outerLineCount = 36, warpIntensity = 1, rotation = -45,
  edgeFadeWidth = 0, colorCycleSpeed = 1, brightness = 0.2,
  color1 = '#ffffff', color2 = '#ffffff', color3 = '#ffffff',
  enableMouseInteraction = true, mouseInfluence = 2, paused = false,
}: LineWavesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const syncRef = useRef<(()=>void)|null>(null);
  useEffect(()=>{pausedRef.current=paused;syncRef.current?.();},[paused]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    container.dataset.ready = 'false';
    let renderer:Renderer;
    try{renderer=new Renderer({alpha:true,premultipliedAlpha:false,dpr:Math.min(window.devicePixelRatio||1,1.5)});}catch{return;}
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    renderer.setSize(container.offsetWidth || 1, container.offsetHeight || 1);
    const program = new Program(gl, {
      vertex: vertexShader, fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height] },
        uSpeed: { value: speed }, uInnerLines: { value: innerLineCount }, uOuterLines: { value: outerLineCount },
        uWarpIntensity: { value: warpIntensity }, uRotation: { value: (rotation * Math.PI) / 180 },
        uEdgeFadeWidth: { value: edgeFadeWidth }, uColorCycleSpeed: { value: colorCycleSpeed },
        uBrightness: { value: brightness },
        uColor1: { value: hexToVec3(color1) }, uColor2: { value: hexToVec3(color2) }, uColor3: { value: hexToVec3(color3) },
        uMouse: { value: new Float32Array([0.5, 0.5]) }, uMouseInfluence: { value: mouseInfluence },
        uEnableMouse: { value: enableMouseInteraction },
      },
    });
    const size=()=>{renderer.setSize(container.offsetWidth||1,container.offsetHeight||1);program.uniforms.uResolution.value=[gl.canvas.width,gl.canvas.height,gl.canvas.width/gl.canvas.height];syncRef.current?.();};
    const ro=new ResizeObserver(size);ro.observe(container);
    const geometry=new Triangle(gl);
    if(!gl.getProgramParameter(program.program,gl.LINK_STATUS)){ro.disconnect();geometry.remove();program.remove();gl.getExtension('WEBGL_lose_context')?.loseContext();return;}
    const mesh = new Mesh(gl, { geometry, program });
    container.appendChild(gl.canvas);

    // Layers sit behind page content (pointer-events: none), so track the pointer on window.
    const current = [0.5, 0.5];
    let target = [0.5, 0.5];
    const onMove = (e: MouseEvent) => {
      const r = gl.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      target = [Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1), Math.min(Math.max(1 - (e.clientY - r.top) / r.height, 0), 1)];
    };
    const onLeave = () => { target = [0.5, 0.5]; };
    if (enableMouseInteraction) {
      window.addEventListener('mousemove', onMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', onLeave);
    }

    let visible=true,raf=0,previous=0,elapsed=0,disposed=false,failed=false;
    const shouldRun=()=>!disposed&&!failed&&visible&&!document.hidden&&!pausedRef.current&&!reduced.matches;
    const draw=()=>{if(disposed||failed)return;try{renderer.render({scene:mesh});container.dataset.ready='true';}catch{failed=true;container.dataset.ready='false';}};
    const stop=()=>{cancelAnimationFrame(raf);raf=0;previous=0;};
    const update=(time:number)=>{
      raf=0;if(!shouldRun())return;
      const delta=previous?Math.min((time-previous)/1000,.05):0;previous=time;elapsed+=delta;
      program.uniforms.uTime.value=elapsed;
      current[0]+=.05*(target[0]-current[0]);current[1]+=.05*(target[1]-current[1]);
      program.uniforms.uMouse.value[0]=current[0];program.uniforms.uMouse.value[1]=current[1];draw();
      if(shouldRun())raf=requestAnimationFrame(update);
    };
    const sync=()=>{stop();if(!document.hidden&&visible)draw();if(shouldRun())raf=requestAnimationFrame(update);};
    const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});io.observe(container);
    const lost=()=>{failed=true;container.dataset.ready='false';stop();};
    gl.canvas.addEventListener('webglcontextlost',lost);
    document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
    syncRef.current=sync;sync();
    return()=>{disposed=true;stop();syncRef.current=null;ro.disconnect();io.disconnect();window.removeEventListener('mousemove',onMove);document.documentElement.removeEventListener('mouseleave',onLeave);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);gl.canvas.removeEventListener('webglcontextlost',lost);gl.canvas.remove();geometry.remove();program.remove();gl.getExtension('WEBGL_lose_context')?.loseContext();};

  }, [speed, innerLineCount, outerLineCount, warpIntensity, rotation, edgeFadeWidth, colorCycleSpeed, brightness, color1, color2, color3, enableMouseInteraction, mouseInfluence]);

  return <div ref={containerRef} className="line-waves-container" />;
}

/** A non-interactive, decorative wave layer. Position/mask it with a className. */
export function WaveLayer({ className = '', ...props }: LineWavesProps & { className?: string }) {
  return <div className={`wave-layer ${className}`} aria-hidden="true"><LineWaves {...props} /></div>;
}
