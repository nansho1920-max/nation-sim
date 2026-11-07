import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** 数値が変わった時にカウンターのようにアニメーションさせる */
export function useCountUp(value, duration = 600) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);
  useEffect(() => {
    if (reduced() || !Number.isFinite(value)) {
      setDisplay(value);
      return undefined;
    }
    const start = performance.now();
    const a = from.current;
    const step = (t) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - (1 - k) ** 3;
      const v = a + (value - a) * eased;
      setDisplay(v);
      from.current = v;
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return display;
}
