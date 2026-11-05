# 国家統治シミュレーター

React + Tailwind CSS + Lucide React で作ったターン制の政治・国家運営シミュレーション。

## 起動

```bash
npm install
npm run dev
```

## 遊び方
- 1ターン = 1ヶ月。右下の「ターンを進める」で進行。2026年4月から120ヶ月（10年）の任期満了で勝利。
- 毎月2回まで政策・外交アクションを実行可能（鎖国のON/OFFは回数を消費しない）。
- 敗北条件: 支持率0%（クーデター） / 国庫マイナスが3ヶ月連続（財政破綻）。
- 進行状況は LocalStorage に自動保存されます。

## 構成
```
src/
  App.jsx                 レイアウトとタブ
  hooks/useGame.js        useReducer + LocalStorage 自動セーブ
  game/constants.js       バランス値・隣国・体制定義
  game/events.js          ランダムイベント定義（宣言的エフェクト）
  game/engine.js          ターン処理・戦争・外交の reducer（シード付き乱数で純粋関数）
  game/utils.js           乱数・日付・書式ヘルパー
  components/             Header / LogPanel / DomesticPanel / DiplomacyPanel /
                          StatusPanel / EventModal / GameOverScreen / EndTurnButton / ConfirmDialog
```
