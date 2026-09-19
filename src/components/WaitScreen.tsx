import { AREA_NAME } from '../data/areas'
import { FACILITIES } from '../data/facilities'
import type { TripState } from '../lib/useTrip'

/** よくある待ち時間。キーボードを出さずに押すだけで入れられるようにする */
const PRESETS = [0, 5, 10, 15, 20, 30, 45, 60, 90]

type Props = {
  state: TripState
  onSetWait: (id: string, min: number, open: boolean) => void
  onToggleMust: (id: string) => void
}

export default function WaitScreen({ state, onSetWait, onToggleMust }: Props) {
  // 待ち時間を打つ意味があるものだけ並べる。土産物屋や食事は省く
  const targets = FACILITIES.filter(
    (f) => f.kind === 'ride' || f.kind === 'show' || f.kind === 'greeting' || f.kind === 'play',
  )

  return (
    <div className="body">
      <div className="section">
        <p className="section__label">いまの待ち時間を入れる</p>

        {targets.map((f) => {
          const w = state.waits[f.id]
          const isMust = state.must.includes(f.id)
          return (
            <div className="wait" key={f.id}>
              <div className="wait__top">
                <div className="wait__main">
                  <div className="wait__name">{f.name}</div>
                  <div className="wait__area">
                    {AREA_NAME[f.area]}
                    {f.qtId == null && ' ・自動取得できない施設'}
                  </div>
                </div>
              </div>

              <div className="wait__chips">
                {PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="chip"
                    aria-pressed={w?.open !== false && w?.min === n}
                    onClick={() => onSetWait(f.id, n, true)}
                  >
                    {n}分
                  </button>
                ))}
                <button
                  type="button"
                  className="chip chip--closed"
                  aria-pressed={w?.open === false}
                  onClick={() => onSetWait(f.id, 0, false)}
                >
                  休止
                </button>
                <button
                  type="button"
                  className="chip chip--must"
                  aria-pressed={isMust}
                  onClick={() => onToggleMust(f.id)}
                >
                  絶対行く
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
