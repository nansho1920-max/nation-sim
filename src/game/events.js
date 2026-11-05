// ランダム国家イベント定義
// effect は宣言的な差分オブジェクト。UIでのプレビュー表示と適用の両方に使う。
//   approval / treasury / economy / military : 数値差分
//   relationTarget : 対象国（イベント発生時に決定）との関係値差分
//   relationAll    : 全隣国との関係値差分
//
// tags:
//   'depression'       → 共産主義で無効化
//   'diplomaticNegative' → 鎖国で一定確率ブロック
//   'riot'             → 資本主義で発生率UP

export const EVENTS = [
  {
    id: 'depression',
    title: '世界恐慌',
    icon: 'TrendingDown',
    tone: 'bad',
    tags: ['depression'],
    weight: 8,
    text: '海外の巨大銀行が破綻し、世界中の株価が暴落した。国内企業の倒産が相次いでいる。',
    options: [
      { label: '大規模財政出動', desc: '国庫を投じて企業と雇用を守る。', effect: { treasury: -300, economy: -3, approval: 2 } },
      { label: '緊縮財政', desc: '支出を削り嵐が過ぎるのを待つ。', effect: { economy: -10, approval: -10 } },
    ],
  },
  {
    id: 'protest',
    title: '反体制派のデモ',
    icon: 'Megaphone',
    tone: 'bad',
    weight: 10,
    text: '首都の中央広場に数万人の群衆が集結し、政権の退陣を要求している。',
    options: [
      { label: '武力で鎮圧', desc: '治安部隊を投入する。国際的な非難は避けられない。', effect: { military: -8, approval: -8 } },
      { label: '資金で解決', desc: '要求の一部を受け入れ補助金を配る。', effect: { treasury: -200, approval: 1 } },
    ],
  },
  {
    id: 'earthquake',
    title: '大地震',
    icon: 'Activity',
    tone: 'bad',
    weight: 6,
    text: 'マグニチュード7.8の巨大地震が工業地帯を直撃した。多数の被災者が救助を待っている。',
    options: [
      { label: '国家予算で復興', desc: '大規模な復興予算を組む。', effect: { treasury: -350, approval: 5 } },
      { label: '軍を派遣', desc: '軍の工兵部隊で救助と復旧を行う。', effect: { military: -10, economy: -4, approval: -2 } },
    ],
  },
  {
    id: 'riot',
    title: '貧富の差による暴動',
    icon: 'Flame',
    tone: 'bad',
    tags: ['riot'],
    weight: 5,
    text: '富裕層と貧困層の格差に怒った市民が商業地区で暴徒化している。',
    options: [
      { label: '鎮圧部隊を投入', desc: '秩序を力で回復する。', effect: { military: -6, approval: -10 } },
      { label: '富裕税を導入', desc: '富裕層に課税し再分配する。資本家は反発する。', effect: { economy: -5, treasury: 150, approval: 7 } },
    ],
  },
  {
    id: 'tech_boom',
    title: '技術革新',
    icon: 'Cpu',
    tone: 'good',
    weight: 6,
    text: '国内の研究所が画期的な半導体技術を開発した。産業界が色めき立っている。',
    options: [
      { label: '国家プロジェクト化', desc: '国費を投じて一気に産業化する。', effect: { treasury: -150, economy: 10 } },
      { label: '民間に任せる', desc: '市場の自然な成長に委ねる。', effect: { economy: 4, approval: 1 } },
    ],
  },
  {
    id: 'spy_scandal',
    title: 'スパイ事件',
    icon: 'Eye',
    tone: 'bad',
    tags: ['diplomaticNegative'],
    needsTarget: true,
    weight: 6,
    text: '{target}の情報機関員が国防省の機密を盗み出そうとして逮捕された。',
    options: [
      { label: '強硬に抗議', desc: '大使を召還し国民の怒りを代弁する。', effect: { relationTarget: -15, approval: 5 } },
      { label: '穏便に処理', desc: '水面下で送還し事を荒立てない。', effect: { relationTarget: -3, approval: -4 } },
    ],
  },
  {
    id: 'border_incident',
    title: '国境紛争',
    icon: 'Swords',
    tone: 'bad',
    tags: ['diplomaticNegative'],
    needsTarget: true,
    weight: 6,
    text: '{target}の部隊が国境線を越えて哨所を設置した。一触即発の状況だ。',
    options: [
      { label: '軍で威嚇', desc: '部隊を展開して撤退を迫る。', effect: { military: -5, relationTarget: -12, approval: 4 } },
      { label: '外交交渉', desc: '補償金を払って穏便に撤退してもらう。', effect: { treasury: -100, relationTarget: 6 } },
    ],
  },
  {
    id: 'trade_embargo',
    title: '経済制裁',
    icon: 'Ban',
    tone: 'bad',
    tags: ['diplomaticNegative'],
    needsTarget: true,
    weight: 4,
    text: '{target}が我が国への輸出入を制限すると一方的に発表した。',
    options: [
      { label: '報復関税', desc: '同等の措置で対抗する。', effect: { economy: -4, relationTarget: -10, approval: 3 } },
      { label: '譲歩して交渉', desc: '相手の要求をのみ制裁解除を求める。', effect: { treasury: -150, relationTarget: 8, approval: -3 } },
    ],
  },
  {
    id: 'harvest',
    title: '記録的豊作',
    icon: 'Wheat',
    tone: 'good',
    weight: 6,
    text: '天候に恵まれ、穀物の収穫量が過去最高を記録した。',
    options: [
      { label: '海外へ輸出', desc: '余剰分を売却し外貨を獲得する。', effect: { treasury: 250, relationAll: 2 } },
      { label: '国民に配布', desc: '食料価格を引き下げ国民に還元する。', effect: { approval: 8 } },
    ],
  },
  {
    id: 'refugees',
    title: '難民の流入',
    icon: 'Users',
    tone: 'neutral',
    weight: 5,
    text: '周辺地域の内戦から逃れた数万人の難民が国境に押し寄せている。',
    options: [
      { label: '受け入れる', desc: '人道的対応で国際的評価を得る。', effect: { treasury: -150, relationAll: 6, approval: -3 } },
      { label: '国境を封鎖', desc: '国内の安定を優先する。', effect: { approval: 3, relationAll: -5 } },
    ],
  },
  {
    id: 'officer_plot',
    title: '青年将校の陰謀',
    icon: 'ShieldAlert',
    tone: 'bad',
    weight: 5,
    condition: (s) => s.approval < 45,
    text: '支持率低下に不満を持つ一部将校がクーデターを計画しているとの密告があった。',
    options: [
      { label: '大粛清', desc: '関与した将校を一斉に拘束する。軍は弱体化する。', effect: { military: -12, approval: 3 } },
      { label: '昇給で懐柔', desc: '軍の待遇を改善して不満を抑える。', effect: { treasury: -200, military: 3 } },
    ],
  },
  {
    id: 'pandemic',
    title: '感染症の流行',
    icon: 'Biohazard',
    tone: 'bad',
    weight: 4,
    text: '新型の感染症が都市部で急拡大している。医療体制がひっ迫しつつある。',
    options: [
      { label: '都市封鎖', desc: '経済活動を止めて感染を抑え込む。', effect: { economy: -8, approval: -2 } },
      { label: '経済を優先', desc: '最低限の対策で経済を回し続ける。', effect: { approval: -10, treasury: -50 } },
    ],
  },
  {
    id: 'resource',
    title: '天然資源の発見',
    icon: 'Gem',
    tone: 'good',
    weight: 4,
    text: '南部の山岳地帯で大規模なレアメタル鉱床が発見された。',
    options: [
      { label: '国営化', desc: '利益を国庫に直接入れる。外国企業は不満を抱く。', effect: { treasury: 400, relationAll: -5 } },
      { label: '外資を誘致', desc: '外国企業と共同開発し産業を育てる。', effect: { economy: 8, relationAll: 5 } },
    ],
  },
  {
    id: 'olympics',
    title: '国際大会の招致',
    icon: 'Trophy',
    tone: 'good',
    weight: 3,
    text: '国際スポーツ大会の開催地に我が国が立候補できることになった。',
    options: [
      { label: '招致する', desc: '巨額の費用がかかるが国威発揚になる。', effect: { treasury: -250, approval: 8, relationAll: 4 } },
      { label: '辞退する', desc: '財政規律を守る。', effect: { approval: -1 } },
    ],
  },
];

export const getEventById = (id) => EVENTS.find((e) => e.id === id);
