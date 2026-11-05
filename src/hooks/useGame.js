import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { SAVE_KEY, SAVE_VERSION } from '../game/constants';
import { createInitialState, gameReducer } from '../game/engine';
import { newSeed } from '../game/utils';

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    const data = JSON.parse(raw);
    if (data?.version !== SAVE_VERSION || !Array.isArray(data.countries)) return createInitialState();
    return data;
  } catch {
    return createInitialState();
  }
}

/** ゲーム状態 + LocalStorage 自動セーブ + アクションをまとめたカスタムフック */
export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadState);

  // 状態が変わるたびに自動セーブ
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      /* ストレージが使えない環境では保存をスキップ */
    }
  }, [state]);

  const actions = useMemo(
    () => ({
      endTurn: () => dispatch({ type: 'END_TURN', seed: newSeed() }),
      resolveEvent: (optionIndex) => dispatch({ type: 'RESOLVE_EVENT', optionIndex }),
      domesticAction: (actionId) => dispatch({ type: 'DOMESTIC_ACTION', actionId }),
      changeIdeology: (ideology) => dispatch({ type: 'CHANGE_IDEOLOGY', ideology }),
      toggleIsolation: () => dispatch({ type: 'TOGGLE_ISOLATION' }),
      sendAid: (countryId) => dispatch({ type: 'SEND_AID', countryId, seed: newSeed() }),
      declareWar: (countryId) => dispatch({ type: 'DECLARE_WAR', countryId }),
      suePeace: (countryId) => dispatch({ type: 'SUE_PEACE', countryId }),
    }),
    [],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* noop */
    }
    dispatch({ type: 'RESET' });
  }, []);

  return { state, actions: { ...actions, reset } };
}
