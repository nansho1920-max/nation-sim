import { useEffect, useRef, useState } from 'react';
import { SPEEDS } from '../game/data/balance';

/**
 * リアルタイムの時間進行。速度0は一時停止。
 * イベント発生時は自動で一時停止し、イベントを処理すると元の速度に戻る。
 */
export function useGameClock(state, dispatch) {
  const [speed, setSpeed] = useState(0);
  const lastSpeed = useRef(1);
  const blocked = !state || !!state.events.pending || !!state.gameOver;
  const wasBlocked = useRef(blocked);
  const autoResume = useRef(0);

  useEffect(() => {
    if (blocked || speed === 0) return undefined;
    const ms = SPEEDS.find((s) => s.id === speed)?.ms ?? 550;
    const id = setInterval(() => dispatch({ type: 'TICK' }), ms);
    return () => clearInterval(id);
  }, [blocked, speed, dispatch]);

  // イベントが解決されたら、直前の速度で再開する
  useEffect(() => {
    if (wasBlocked.current && !blocked && state && !state.gameOver && autoResume.current) {
      setSpeed(autoResume.current);
      autoResume.current = 0;
    }
    if (!wasBlocked.current && blocked && speed > 0) {
      autoResume.current = speed;
      setSpeed(0);
    }
    wasBlocked.current = blocked;
  }, [blocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeSpeed = (v) => {
    if (v > 0) lastSpeed.current = v;
    autoResume.current = 0;
    setSpeed(v);
  };
  const togglePause = () => changeSpeed(speed === 0 ? lastSpeed.current : 0);

  // キーボード操作: Space=一時停止, 1/2/3=速度
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      } else if (e.key === '1') changeSpeed(1);
      else if (e.key === '2') changeSpeed(3);
      else if (e.key === '3') changeSpeed(5);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return { speed, setSpeed: changeSpeed, togglePause, blocked };
}
