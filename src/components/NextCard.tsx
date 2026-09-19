import type { Suggestion } from '../types'

type Props = {
  s: Suggestion
  onGo: (id: string) => void
}

export default function NextCard({ s, onGo }: Props) {
  const far = s.walkM >= 400
  return (
    <div className="next">
      <h2 className="next__name">{s.facility.name}</h2>

      <div className="next__facts">
        <span className={`fact ${s.waitMin <= 10 ? 'fact--wait' : ''}`}>待ち {s.waitMin}分</span>
        <span className={`fact ${far ? 'fact--far' : ''}`}>
          {s.walkM === 0 ? 'このエリア' : `${s.walkM}m`}
        </span>
        <span className="fact">ぜんぶで {s.totalMin}分</span>
      </div>

      {/* 点数は出さない。当日読み上げて家族を動かせるのは理由の方 */}
      <ul className="reasons">
        {s.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <button type="button" className="go" onClick={() => onGo(s.facility.id)}>
        ここに行く
      </button>
    </div>
  )
}
