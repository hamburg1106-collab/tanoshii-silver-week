import { AREA_NAME } from '../data/areas'
import { FACILITIES } from '../data/facilities'
import type { TripState } from '../lib/useTrip'
import type { Context } from '../types'

/** よくある待ち時間。キーボードを出さずに押すだけで入れられるようにする */
const PRESETS = [0, 5, 10, 15, 20, 30, 45, 60, 90]

type Props = {
  ctx: Context
  state: TripState
  onSetWait: (id: string, min: number, open: boolean) => void
  onClearWait: (id: string) => void
  onToggleMust: (id: string) => void
}

export default function WaitScreen({
  ctx,
  state,
  onSetWait,
  onClearWait,
  onToggleMust,
}: Props) {
  // 待ち時間を打つ意味があるものだけ並べる。土産物屋や食事は省く
  const targets = FACILITIES.filter(
    (f) => f.kind === 'ride' || f.kind === 'show' || f.kind === 'greeting' || f.kind === 'play',
  )

  return (
    <div className="body">
      <div className="section">
        <p className="section__label">いまの待ち時間</p>
        <p className="hint">
          自動で取れた値は枠だけ、自分で入れた値は塗りつぶしで出ます。
          選んである数字をもう一度押すと、自動の値に戻ります。
        </p>

        {targets.map((f) => {
          // 表示は自動と手入力を混ぜたあとの値。
          // 手入力だけを見ると、自動で取れていても空に見えてしまう
          const w = ctx.waits[f.id]
          const manual = w?.source === 'manual'
          const isMust = state.must.includes(f.id)

          return (
            <div className="wait" key={f.id}>
              <div className="wait__top">
                <div className="wait__main">
                  <div className="wait__name">{f.name}</div>
                  <div className="wait__area">
                    {AREA_NAME[f.area]}
                    {f.qtId == null && ' ・自動取得できません'}
                  </div>
                </div>
                <div className={`wait__now ${manual ? 'wait__now--manual' : ''}`}>
                  {w == null ? '—' : w.open === false ? '休止' : `${w.min}分`}
                </div>
              </div>

              <div className="wait__chips">
                {PRESETS.map((n) => {
                  const on = w?.open !== false && w?.min === n
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`chip ${on && !manual ? 'chip--auto' : ''}`}
                      aria-pressed={on}
                      onClick={() => (on && manual ? onClearWait(f.id) : onSetWait(f.id, n, true))}
                    >
                      {n}分
                    </button>
                  )
                })}
                <button
                  type="button"
                  className={`chip chip--closed ${w?.open === false && !manual ? 'chip--auto' : ''}`}
                  aria-pressed={w?.open === false}
                  onClick={() =>
                    w?.open === false && manual ? onClearWait(f.id) : onSetWait(f.id, 0, false)
                  }
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
