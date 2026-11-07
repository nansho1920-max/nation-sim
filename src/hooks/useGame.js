import { useCallback, useEffect, useReducer, useRef } from 'react';
import { gameReducer } from '../game/engine/reducer';
import { loadGame, saveGame } from '../game/save';
import { randomSeed } from '../game/core/rng';

/** ゲーム状態とセーブ。月が変わった時・一時停止時・ページを閉じる時に自動保存する */
export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadGame);
  const stateRef = useRef(state);
  stateRef.current = state;

  const month = state?.month;
  const pending = !!state?.events?.pending;
  const over = !!state?.gameOver;
  const actionsKey = state?.logSeq;
  useEffect(() => {
    if (stateRef.current) saveGame(stateRef.current);
  }, [month, pending, over, actionsKey]);

  useEffect(() => {
    const save = () => stateRef.current && saveGame(stateRef.current);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', save);
    return () => {
      window.removeEventListener('beforeunload', save);
      document.removeEventListener('visibilitychange', save);
    };
  }, []);

  const newGame = useCallback((options) => dispatch({ type: 'NEW_GAME', options: { ...options, seed: randomSeed() } }), []);
  const quit = useCallback(() => {
    saveGame(null);
    dispatch({ type: 'CLEAR' });
  }, []);

  return { state, dispatch, newGame, quit };
}
