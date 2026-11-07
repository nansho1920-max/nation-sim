// 国際機関

export const ORGS = [
  {
    id: 'cec',
    name: '大陸経済共同体',
    short: 'CEC',
    desc: '加盟国間の関税を撤廃する経済共同体。潜在成長率+0.4%、加盟国との関係が毎月改善。',
    members: ['celestia', 'ornea', 'isthia', 'mireth'],
    effects: { potential: 0.4 },
    requirements: [
      { label: '市場経済であること', check: (s, c) => !c.fx.planned },
      { label: '鎖国していないこと', check: (s, c) => !c.fx.isolation },
      { label: '加盟国との平均関係値が50以上', check: (s, c) => c.avgRel >= 50 },
    ],
  },
  {
    id: 'cso',
    name: '大陸安全保障機構',
    short: 'CSO',
    desc: '集団防衛の軍事同盟。加盟国が攻撃されると他の加盟国が参戦する。防衛予算GDP比2%以上が条件。',
    members: ['isthia', 'celestia', 'mireth'],
    effects: {},
    requirements: [
      { label: '防衛予算がGDP比2%以上', check: (s) => s.econ.budget.military >= 2 },
      { label: '加盟国との平均関係値が55以上', check: (s, c) => c.avgRel >= 55 },
    ],
  },
  {
    id: 'ccf',
    name: '気候変動枠組条約',
    short: 'CCF',
    desc: '脱炭素を誓う国際条約。国際評価が毎月上昇し、緑の党の支持が伸びる。',
    members: ['ornea', 'mireth', 'celestia', 'isthia'],
    effects: { reputationTrend: 0.3 },
    requirements: [{ label: '再生可能エネルギー比率30%以上', check: (s, c) => c.renewableShare >= 30 }],
  },
];

export const getOrg = (id) => ORGS.find((o) => o.id === id);
