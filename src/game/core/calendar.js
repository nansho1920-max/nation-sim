export const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

/** 日付を1日進める。月が変わったら monthChanged=true を返す */
export function addDay(date) {
  const { y, m, d } = date;
  if (d < daysInMonth(y, m)) return { date: { y, m, d: d + 1 }, monthChanged: false };
  if (m < 12) return { date: { y, m: m + 1, d: 1 }, monthChanged: true };
  return { date: { y: y + 1, m: 1, d: 1 }, monthChanged: true };
}

export const formatDate = ({ y, m, d }) => `${y}年${m}月${d}日`;
export const formatYM = ({ y, m }) => `${y}年${m}月`;

/** 開始年月からの経過月数を年月に変換 */
export function monthToYM(start, months) {
  const idx = start.m - 1 + months;
  return { y: start.y + Math.floor(idx / 12), m: (idx % 12) + 1 };
}
