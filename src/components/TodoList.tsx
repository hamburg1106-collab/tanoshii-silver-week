import { BY_ID } from '../data/facilities'
import { hasBothLanesNow, type TodoAction } from '../lib/actions'
import { hhmm } from '../lib/useTrip'
import type { Secured } from '../types'

const URGENCY_LABEL: Record<TodoAction['urgency'], string> = {
  now: 'いま',
  blocked: '待ち',
  later: 'あとで',
  standby: '並ぶ',
  missed: '手遅れ',
}

type Props = {
  actions: TodoAction[]
  secured: Record<string, Secured>
  failed: string[]
  onSecured: (id: string) => void
  onFailed: (id: string) => void
  onUseAt: (id: string, useAt: string) => void
  onClear: (id: string) => void
  /** 「いま」画面に出す短縮版。急ぎのものだけ、説明は省く */
  compact?: boolean
}

export default function TodoList({
  actions,
  secured,
  failed,
  onSecured,
  onFailed,
  onUseAt,
  onClear,
  compact,
}: Props) {
  const shown = compact ? actions.filter((a) => a.urgency === 'now').slice(0, 2) : actions
  const securedIds = Object.keys(secured)
  if (shown.length === 0 && (compact || securedIds.length === 0)) return null

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

          {/*
            結果は2つある。「取れた」しか無いと、外れたものが一日じゅう
            「いま引いて」と出続けて、リストが信用されなくなる。
          */}
          {a.urgency !== 'missed' && a.urgency !== 'standby' && (
            <div className="todo__acts">
              <button
                type="button"
                className="todo__act todo__act--ok"
                onClick={() => onSecured(a.facility.id)}
              >
                取れた
              </button>
              <button
                type="button"
                className="todo__act todo__act--ng"
                onClick={() => onFailed(a.facility.id)}
              >
                ダメだった
              </button>
            </div>
          )}

          {a.urgency === 'standby' && (
            <button
              type="button"
              className="todo__act todo__act--undo"
              onClick={() => onClear(a.facility.id)}
            >
              やっぱり買えた
            </button>
          )}
        </div>
      ))}

      {!compact && securedIds.length > 0 && (
        <div className="secured">
          <p className="section__label">取れたもの</p>
          {securedIds.map((id) => {
            const s = secured[id]
            return (
              <div className="secured__row" key={id}>
                <div className="secured__top">
                  <span className="secured__name">{BY_ID[id]?.name ?? id}</span>
                  <button type="button" className="secured__undo" onClick={() => onClear(id)}>
                    取り消す
                  </button>
                </div>
                <div className="secured__at">{hhmm(new Date(s.at))} に確保</div>

                {/*
                  利用開始を入れると、次のDPAが買える時刻が早まることがある。
                  「購入＋60分」と「利用開始」の早い方が解禁なので、
                  ここが空だと必ず長い方で待たされる。
                */}
                <label className="secured__use">
                  <span className="secured__use-label">利用開始</span>
                  <input
                    type="time"
                    className="secured__use-input"
                    value={s.useAt ?? ''}
                    onChange={(e) => onUseAt(id, e.target.value)}
                  />
                </label>
                {!s.useAt && (
                  <div className="secured__hint">
                    入れると、次の枠が買える時刻が早まることがあります
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!compact && failed.length > 0 && (
        <div className="secured">
          <p className="section__label">ダメだったもの</p>
          {failed.map((id) => (
            <button type="button" className="failed__row" key={id} onClick={() => onClear(id)}>
              <span className="secured__name">{BY_ID[id]?.name ?? id}</span>
              <span className="secured__at">戻す</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
