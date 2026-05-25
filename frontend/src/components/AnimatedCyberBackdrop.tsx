import { useEffect, useRef } from 'react';

/**
 * Login-Style: animiertes Cyber-Grid (Canvas) + leichte Vignette.
 * `fixed` für Einsatz im App-Layout; deckt den Viewport ab.
 */
export default function AnimatedCyberBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let tick = 0;
    let scanY = 0;
    let frameId = 0;
    const CYAN = '0, 212, 255';
    const SCAN_SPEED = 0.4;
    const PARTICLE_COUNT = 55;
    let particles: Array<{ x: number; y: number; r: number; vy: number; alpha: number; fade: number }> = [];

    const makeParticle = (fromBottom = false) => ({
      x: Math.random() * width,
      y: fromBottom ? height + 4 : Math.random() * height,
      r: Math.random() * 1.2 + 0.3,
      vy: -(Math.random() * 0.35 + 0.1),
      alpha: Math.random() * 0.5 + 0.1,
      fade: Math.random() * 0.003 + 0.001,
    });

    const initParticles = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => makeParticle(false));
    };

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    const drawGrid = () => {
      const horizon = height * 0.52;
      const vpX = width / 2;
      const lines = 24;
      const spread = 3.6;

      ctx.save();
      ctx.lineWidth = 1;

      for (let i = 0; i <= lines; i++) {
        const t = i / lines;
        const yRaw = horizon + Math.pow(t, 1.6) * (height - horizon);
        const y = ((yRaw - horizon + tick * SCAN_SPEED) % (height - horizon)) + horizon;
        const xL = vpX - (width * spread) / 2 * Math.pow(t, 1.0);
        const xR = vpX + (width * spread) / 2 * Math.pow(t, 1.0);
        const alpha = Math.pow(t, 0.7) * 0.18;
        ctx.strokeStyle = `rgba(${CYAN}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(xL, y);
        ctx.lineTo(xR, y);
        ctx.stroke();
      }

      const vLines = 16;
      for (let i = 0; i <= vLines; i++) {
        const t = i / vLines;
        const xB = vpX - (width * spread) / 2 + t * width * spread;
        ctx.strokeStyle = `rgba(${CYAN}, 0.06)`;
        ctx.beginPath();
        ctx.moveTo(vpX, horizon);
        ctx.lineTo(xB, height + 40);
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawHorizon = () => {
      const y = height * 0.52;
      const gradient = ctx.createLinearGradient(0, y - 60, 0, y + 60);
      gradient.addColorStop(0, `rgba(${CYAN}, 0)`);
      gradient.addColorStop(0.5, `rgba(${CYAN}, 0.07)`);
      gradient.addColorStop(1, `rgba(${CYAN}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y - 60, width, 120);
    };

    const drawParticles = () => {
      particles.forEach((p, i) => {
        p.y += p.vy;
        p.alpha -= p.fade;
        if (p.alpha <= 0 || p.y < -10) {
          particles[i] = makeParticle(true);
          return;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${CYAN}, ${p.alpha})`;
        ctx.fill();
      });
    };

    const drawScanLine = () => {
      scanY = (scanY + 0.8) % height;
      const gradient = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 2);
      gradient.addColorStop(0, `rgba(${CYAN}, 0)`);
      gradient.addColorStop(1, `rgba(${CYAN}, 0.04)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, scanY - 60, width, 62);
      ctx.strokeStyle = `rgba(${CYAN}, 0.12)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(width, scanY);
      ctx.stroke();
    };

    const loop = () => {
      tick += 1;
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createRadialGradient(width / 2, height * 0.5, 0, width / 2, height * 0.5, width * 0.8);
      bg.addColorStop(0, '#080c1a');
      bg.addColorStop(1, '#04050d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      drawGrid();
      drawHorizon();
      drawParticles();
      drawScanLine();
      frameId = window.requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    resize();
    frameId = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-full w-full" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,rgba(0,212,255,0.08)_0%,rgba(4,5,13,0.92)_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-[2] bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(4,5,13,0.88)_100%)]"
        aria-hidden
      />
    </>
  );
}
