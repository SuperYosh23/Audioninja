import { useRef, useEffect } from 'react';

function resolveColor(variable, fallback) {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
}

export const WavyProgressBar = ({ progress = 0, height, onSeek }) => {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const colors = {
      track: resolveColor('--color-surface-container-high', '#2B2930'),
      primary: resolveColor('--color-primary', '#FF8A9B'),
    };

    let phase = 0;
    let rafId;

    const draw = () => {
      phase = (phase + 1.5) % 360;
      const rect = wrap.getBoundingClientRect();
      const w = rect.width;

      if (w === 0) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      canvas.width = w * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${height}px`;

      const smooth = Math.min(1, Math.max(0, progressRef.current));

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      const centerY = height / 2;
      const strokeW = height * 0.7;
      const amp = height * 0.15;
      const wl = 32;
      const phaseRad = phase * Math.PI / 180;
      const pw = Math.max(0, Math.min(w, smooth * w));

      // Track
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.strokeStyle = colors.track;
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Active wavy indicator
      ctx.beginPath();
      for (let x = 0; x <= pw; x += 1) {
        const y = centerY + amp * Math.sin(2 * Math.PI * x / wl + phaseRad);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.stroke();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [height]);

  const handleClick = (e) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(((e.clientX - rect.left) / rect.width));
  };

  return (
    <div
      ref={wrapRef}
      onClick={handleClick}
      style={{ width: '100%', height, cursor: 'pointer', position: 'relative' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height }} />
    </div>
  );
};
