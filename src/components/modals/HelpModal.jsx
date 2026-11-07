import { X } from 'lucide-react';
import Modal from './Modal';

const SECTIONS = [
  ['目的', '2026年4月から10年間（120ヶ月）の任期を全うすること。任期終了時に経済・国民生活・教育・財政・外交・環境・政治の7分野で政権が採点され、称号が贈られる。'],
  ['時間の流れ', '時間は1日ずつ自動で進む。上部の ▶ と 1x/3x/5x で速度を変えられる（Spaceキーで一時停止、1・2・3キーで速度切替）。国家イベントが起きると自動で一時停止する。毎月1日に経済・社会・政治・外交がまとめて計算される。'],
  ['政治資本', '法案の提出、予算の改定、外交行動、大臣の任命などに使う。支持率が高く、議会で過半数を持っているほど毎月多く貯まる。'],
  ['経済・財政', '税率と予算配分（GDP比）を決めて「予算を成立させる」。赤字は国債で埋められ、債務が膨らむと国債利回りが上がり利払いが増える。債務がGDPの300%を超えると財政破綻。金融政策は中央銀行に任せることも、自分で決めることもできる。'],
  ['国民', '国民は6つの集団に分かれ、それぞれ重視するものが違う。支持率は各集団の満足度の加重平均。不満が溜まった集団はストライキや抗議デモを起こす。'],
  ['政治', '4年ごとに総選挙がある。与党連合が過半数（151議席）を失い、第一党でもなくなると政権交代でゲームオーバー。法案は議会の採決で決まり、成立前に賛成見込みが分かる。憲法改正には200議席が必要。'],
  ['世界', '大陸には8つの国がある。AI国家は互いに戦争し、貿易協定を提案し、制裁を科す。地図のモードを切り替えて情勢を把握しよう。関係値が20を下回った国は宣戦布告してくることがある。'],
  ['技術', '研究開発予算と教育水準から研究ポイントが生まれる。技術を研究すると成長率や新しい法律が解禁され、時代が進む。'],
  ['ゲームオーバー', '支持率10%未満が3ヶ月続く（革命）／選挙での敗北（政権交代）／債務GDP比300%超（財政破綻）／インフレ率300%超（ハイパーインフレ）／全領土の喪失。'],
  ['セーブ', '進行状況はブラウザに自動保存される。同じブラウザで開けば続きから遊べる。'],
];

export default function HelpModal({ onClose }) {
  return (
    <Modal onClose={onClose} className="max-w-2xl" labelledBy="help-title">
      <div className="rounded-2xl border border-line-strong bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="help-title" className="font-serif text-xl font-bold">
            遊び方
          </h2>
          <button onClick={onClose} className="btn h-8 w-8 text-ink-dim hover:bg-raised" aria-label="閉じる">
            <X className="h-4 w-4" />
          </button>
        </div>
        <dl className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4 scroll-thin">
          {SECTIONS.map(([t, d]) => (
            <div key={t}>
              <dt className="font-serif font-bold text-brass-light">{t}</dt>
              <dd className="mt-0.5 text-[13px] leading-relaxed text-ink-dim">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}
