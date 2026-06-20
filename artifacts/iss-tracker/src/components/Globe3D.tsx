import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface Globe3DProps {
  issLat: number;
  issLon: number;
  orbitPath: Array<{ lat: number; lon: number }>;
  interactive?: boolean;
  mini?: boolean;
}

function latLonToXYZ(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function FallbackGlobe({ issLat, issLon, orbitPath }: Pick<Globe3DProps, 'issLat' | 'issLon' | 'orbitPath'>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const rotRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let t = 0;
    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      // Draw star field
      for (let i = 0; i < 200; i++) {
        const sx = (i * 137.5 % W);
        const sy = (i * 97.3 % H);
        const opacity = 0.3 + 0.4 * Math.sin(t * 0.8 + i);
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.beginPath();
        ctx.arc(sx, sy, i % 3 === 0 ? 1 : 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const cx = W / 2;
      const cy = H / 2;
      const r = Math.min(W, H) * 0.38;

      rotRef.current += 0.003;
      const rot = rotRef.current;

      // Atmosphere glow
      const atmGrad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.15);
      atmGrad.addColorStop(0, 'rgba(0,100,255,0.08)');
      atmGrad.addColorStop(0.5, 'rgba(0,150,255,0.05)');
      atmGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = atmGrad;
      ctx.fill();

      // Earth gradient
      const earthGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
      earthGrad.addColorStop(0, '#1a6090');
      earthGrad.addColorStop(0.4, '#0d3d5c');
      earthGrad.addColorStop(0.8, '#071828');
      earthGrad.addColorStop(1, '#020a12');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = earthGrad;
      ctx.fill();

      // Continent shapes (simplified)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      const continents = [
        { x: 0.3, y: 0.2, w: 0.15, h: 0.3 },
        { x: 0.25, y: 0.55, w: 0.12, h: 0.25 },
        { x: 0.45, y: 0.15, w: 0.35, h: 0.45 },
        { x: 0.5, y: 0.6, w: 0.1, h: 0.15 },
        { x: 0.72, y: 0.35, w: 0.12, h: 0.3 },
        { x: 0.78, y: 0.55, w: 0.15, h: 0.25 },
      ];
      continents.forEach(c => {
        const xOff = ((c.x + rot / (2 * Math.PI)) % 1);
        const ex = cx - r + xOff * r * 2;
        const ey = cy - r + c.y * r * 2;
        ctx.fillStyle = 'rgba(34,85,34,0.5)';
        ctx.beginPath();
        ctx.ellipse(ex, ey, c.w * r * 0.8, c.h * r * 0.6, 0.3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Grid lines
      ctx.strokeStyle = 'rgba(0,200,255,0.1)';
      ctx.lineWidth = 0.5;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy + i * r / 2.5, r * Math.sqrt(1 - (i / 2.5) ** 2), r * 0.08, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const angle = (i / 6) * Math.PI + rot;
        ctx.ellipse(cx, cy, r * Math.abs(Math.cos(angle)), r, angle > Math.PI / 2 && angle < (3 * Math.PI / 2) ? 0 : 0.001, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Night side
      const nightGrad = ctx.createRadialGradient(cx + r * 0.5, cy, 0, cx + r * 0.5, cy, r * 1.5);
      nightGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
      nightGrad.addColorStop(0.5, 'rgba(0,0,0,0.2)');
      nightGrad.addColorStop(1, 'transparent');
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = nightGrad;
      ctx.fillRect(cx, cy - r, r, r * 2);
      ctx.restore();

      // Earth border glow
      const edgeGrad = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r);
      edgeGrad.addColorStop(0, 'transparent');
      edgeGrad.addColorStop(1, 'rgba(0,150,255,0.3)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = edgeGrad;
      ctx.fill();

      // Orbit path
      if (orbitPath.length > 1) {
        ctx.beginPath();
        orbitPath.forEach((p, i) => {
          const nx = cx + ((p.lon / 180) * r * Math.cos(rot * 0.5));
          const ny = cy - (p.lat / 90) * r * 0.9;
          if (i === 0) ctx.moveTo(nx, ny);
          else ctx.lineTo(nx, ny);
        });
        ctx.strokeStyle = 'rgba(0,200,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // ISS marker
      const issX = cx + ((issLon / 180) * r * Math.cos(rot * 0.5));
      const issY = cy - (issLat / 90) * r * 0.9;
      const pulse = 0.8 + 0.2 * Math.sin(t * 4);

      // Glow
      const issGlow = ctx.createRadialGradient(issX, issY, 0, issX, issY, 14 * pulse);
      issGlow.addColorStop(0, 'rgba(0,255,200,0.6)');
      issGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(issX, issY, 14 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = issGlow;
      ctx.fill();

      // ISS dot
      ctx.beginPath();
      ctx.arc(issX, issY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffcc';
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // ISS label
      ctx.fillStyle = 'rgba(0,255,200,0.9)';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText('ISS', issX + 7, issY - 7);

      t += 0.016;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [issLat, issLon, orbitPath]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={480}
      className="w-full h-full"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}

export default function Globe3D({ issLat, issLon, orbitPath, interactive = true, mini = false }: Globe3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el || initialized.current) return;
    initialized.current = true;

    // Test WebGL support first
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!testCtx) {
      setWebglFailed(true);
      return;
    }

    const w = el.clientWidth || 600;
    const h = el.clientHeight || 400;

    let renderer: THREE.WebGLRenderer;
    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
      camera.position.z = mini ? 2.2 : 2.5;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);

      // Stars
      const starGeo = new THREE.BufferGeometry();
      const starCount = mini ? 500 : 2000;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i++) starPositions[i] = (Math.random() - 0.5) * 100;
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.8 })));

      // Earth
      const loader = new THREE.TextureLoader();
      const globeGeo = new THREE.SphereGeometry(1, 64, 64);
      const earthMat = new THREE.MeshPhongMaterial({ color: 0x1a3a5c, emissive: 0x0a1a2a, specular: 0x4488cc, shininess: 15 });
      const globe = new THREE.Mesh(globeGeo, earthMat);
      scene.add(globe);

      loader.load('https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Blue_Marble_2002.png/1280px-Blue_Marble_2002.png', (tex) => {
        earthMat.map = tex;
        earthMat.color.set(0xffffff);
        earthMat.needsUpdate = true;
      });

      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.02, 32, 32), new THREE.MeshPhongMaterial({ color: 0x0066ff, transparent: true, opacity: 0.08 })));

      // Grid
      const grid = new THREE.Object3D();
      for (let lat = -60; lat <= 60; lat += 30) {
        const pts: THREE.Vector3[] = [];
        for (let lon2 = 0; lon2 <= 360; lon2 += 5) pts.push(latLonToXYZ(lat, lon2 - 180, 1.01));
        grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.08 })));
      }
      for (let lon2 = -180; lon2 <= 180; lon2 += 30) {
        const pts: THREE.Vector3[] = [];
        for (let lat2 = -90; lat2 <= 90; lat2 += 5) pts.push(latLonToXYZ(lat2, lon2, 1.01));
        grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.08 })));
      }
      scene.add(grid);

      const issGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const issMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
      const issMarker = new THREE.Mesh(issGeo, issMat);
      const issPos = latLonToXYZ(issLat, issLon, 1.12);
      issMarker.position.copy(issPos);
      scene.add(issMarker);

      const ringGeo = new THREE.RingGeometry(0.03, 0.055, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(issPos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      scene.add(ring);

      if (orbitPath.length > 1) {
        const pts = orbitPath.map(p => latLonToXYZ(p.lat, p.lon, 1.12));
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.4 })));
      }

      scene.add(new THREE.AmbientLight(0x223344, 0.8));
      const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
      sun.position.set(5, 3, 5);
      scene.add(sun);

      let rotY = 0.3, rotX = 0.1, isDragging = false, prevMouse = { x: 0, y: 0 }, t2 = 0;

      const onDown = (e: MouseEvent) => { if (!interactive) return; isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
      const onMove = (e: MouseEvent) => { if (!isDragging || !interactive) return; rotY += (e.clientX - prevMouse.x) * 0.005; rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX + (e.clientY - prevMouse.y) * 0.003)); prevMouse = { x: e.clientX, y: e.clientY }; };
      const onUp = () => { isDragging = false; };
      renderer.domElement.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);

      let animId: number;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        t2 += 0.016;
        if (!isDragging) rotY += 0.002;
        globe.rotation.y = rotY;
        globe.rotation.x = rotX;
        grid.rotation.y = rotY;
        grid.rotation.x = rotX;
        issMarker.scale.setScalar(0.9 + 0.1 * Math.sin(t2 * 4));
        ring.scale.setScalar(0.9 + 0.2 * Math.sin(t2 * 3));
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.3 * Math.sin(t2 * 3);
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        if (!el) return;
        const w2 = el.clientWidth, h2 = el.clientHeight;
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
        renderer.setSize(w2, h2);
      };
      window.addEventListener('resize', onResize);

      return () => {
        cancelAnimationFrame(animId);
        renderer.domElement.removeEventListener('mousedown', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      };
    } catch {
      setWebglFailed(true);
    }
  }, []);

  if (webglFailed) {
    return <FallbackGlobe issLat={issLat} issLon={issLon} orbitPath={orbitPath} />;
  }

  return <div ref={mountRef} className="w-full h-full" style={{ cursor: interactive ? 'grab' : 'default' }} />;
}
