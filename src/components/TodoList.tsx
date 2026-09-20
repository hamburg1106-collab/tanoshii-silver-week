import { BY_ID } from '../data/facilities'
import { hasBothLanesNow, type TodoAction } from '../lib/actions'
import { hhmm } from '../lib/useTrip'

const URGENCY_LABEL: Record<TodoAction['urgency'], string> = {
  now: 'いま',
  blocked: '待ち',
  later: 'あとで',
  missed: '手遅れ',
}

type Props = {
  actions: TodoAction[]
  /** 確保済みの施設id → 時刻。取り消し表示に使う */
  secured: Record<string, string>
  onToggle: (id: string) => void
  /** 「いま」画面に出す短縮版。急ぎのものだけ、説明は省く */
  compact?: boolean
}

export default function TodoList({ actions, secured, onToggle, compact }: Props) {
  const shown = compact ? actions.filter((a) => a.urgency === 'now').slice(0, 2) : actions
  if (shown.length === 0) return null

  return (
    <div className="todos">
      {/*
        アトラクション枠とショー枠は別カウントなので、片方を買っても
        もう片方は待たずに買える。知らないと1つずつ買って時間を捨てる。
      */}
      {hasBothLanesNow(shown) && (
        <p className="todos__tip">
          アトラクションとショーは別枠です。<b>続けて両方買えます</b>
        </p>
      )}

      {shown.map((a) => (
        <div className={`todo todo--${a.urgency}`} key={a.facility.id}>
          <div className="todo__head">
            <span className={`todo__tag todo__tag--${a.urgency}`}>
              {URGENCY_LABEL[a.urgency]}
            </span>
            <span className="todo__label">{a.label}</span>
          </div>

          <div className="todo__detail">{a.detail}</div>

          <div className="todo__reason">
            {a.urgency === 'blocked' && a.availableFrom
              ? `${hhmm(a.availableFrom)}から買えます。${a.reason}`
              : a.reason}
          </div>

          {a.access.unverified && (
            <div className="todo__warn">この価格・対象は裏が取れていません。アプリで確認を</div>
          )}

          {a.urgency !== 'missed' && (
            <button
              type="button"
              className="todo__done"
              onClick={() => onToggle(a.facility.id)}
            >
              取れた
            </button>
          )}
        </div>
      ))}

      {!compact && Object.keys(secured).length > 0 && (
        <div className="secured">
          <p className="section__label">取れたもの</p>
          {Object.entries(secured).map(([id, iso]) => (
            <button
              type="button"
              className="secured__row"
              key={id}
              onClick={() => onToggle(id)}
            >
              <span className="secured__name">{BY_ID[id]?.name ?? id}</span>
              <span className="secured__at">{hhmm(new Date(iso))}に確保 ・ 取り消す</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
