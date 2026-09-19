import { AREA_NAME, AREA_ORDER } from '../data/areas'
import { BY_ID } from '../data/facilities'
import type { TripState } from '../lib/useTrip'
import { hhmm } from '../lib/useTrip'
import type { AreaId } from '../types'

type Props = {
  state: TripState
  onPatch: (p: Partial<TripState>) => void
  onUndo: (id: string) => void
  onReset: () => void
}

export default function SettingsScreen({ state, onPatch, onUndo, onReset }: Props) {
  const woke = state.morningWokeAt ? hhmm(new Date(state.morningWokeAt)) : ''

  const setWoke = (v: string) => {
    if (!v) return onPatch({ morningWokeAt: null })
    const [h, m] = v.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    onPatch({ morningWokeAt: d.toISOString() })
  }

  return (
    <div className="body">
      <div className="section">
        <p className="section__label">今日のこと</p>

        <div className="field">
          <label className="field__label" htmlFor="woke">
            柊が今朝起きた時刻
          </label>
          <input id="woke" type="time" value={woke} onChange={(e) => setWoke(e.target.value)} />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="leave">
            パークを出る時刻
          </label>
          <input
            id="leave"
            type="time"
            value={state.leaveAt}
            onChange={(e) => onPatch({ leaveAt: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="area">
            いまいるエリア
          </label>
          <div className="wait__chips">
            {AREA_ORDER.map((a: AreaId) => (
              <button
                key={a}
                type="button"
                className="chip"
                aria-pressed={state.area === a}
                onClick={() => onPatch({ area: a })}
              >
                {AREA_NAME[a]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <p className="section__label">まわったところ（{state.done.length}件）</p>
        {state.done.length === 0 ? (
          <div className="empty">まだありません</div>
        ) : (
          <div className="alts">
            {state.done.map((id) => (
              <div className="alt" key={id}>
                <div className="alt__main">
                  <div className="alt__name">{BY_ID[id]?.name ?? id}</div>
                </div>
                <button type="button" className="alt__go" onClick={() => onUndo(id)}>
                  取り消す
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <button
          type="button"
          className="danger"
          onClick={() => {
            if (confirm('今日の記録をぜんぶ消します。よろしいですか？')) onReset()
          }}
        >
          今日の記録を消す
        </button>
      </div>
    </div>
  )
}
