// 内閣（省庁と大臣候補の名前）

export const MINISTRIES = [
  { id: 'finance', name: '財務大臣', ministry: '財務省', effect: '徴税効率', desc: '税収の効率と国債市場の信認に影響する。' },
  { id: 'economy', name: '経済産業大臣', ministry: '経済産業省', effect: '経済成長', desc: '経済の潜在成長率に影響する。' },
  { id: 'welfare', name: '厚生労働大臣', ministry: '厚生労働省', effect: '医療・福祉', desc: '医療・社会保障予算の効果に影響する。' },
  { id: 'education', name: '文部科学大臣', ministry: '文部科学省', effect: '教育・研究', desc: '教育水準と研究ポイントに影響する。' },
  { id: 'defense', name: '防衛大臣', ministry: '防衛省', effect: '軍事力', desc: '軍事力の水準と戦争での戦力に影響する。' },
  { id: 'foreign', name: '外務大臣', ministry: '外務省', effect: '外交', desc: '外交行動による関係改善の幅に影響する。' },
  { id: 'environment', name: '環境大臣', ministry: '環境省', effect: '環境', desc: '環境改善と再エネ導入の効率に影響する。' },
];

export const SURNAMES = ['佐伯', '神崎', '早瀬', '久我', '真壁', '東條', '柊', '鷹野', '御影', '桐生', '氷室', '宗像', '白石', '如月', '葛城', '鳴海', '篠宮', '朝霧', '速水', '雨宮', '堂島', '九条', '橘', '蒼井'];
export const GIVEN_NAMES = ['誠一', '玲子', '剛', '美咲', '隆之', '沙織', '健吾', '葵', '修平', '千尋', '大輔', '由紀', '亮', '真理子', '直人', '楓', '慎也', '遥', '恭介', '紗希'];

/** 能力値(1-5) → 省庁効率 (0.88〜1.12) */
export const competenceToEff = (c) => 0.82 + c * 0.06;
