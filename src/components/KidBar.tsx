import { napPlan, shouldAskSleepy, wakeForecast } from '../lib/suggest'
import { hhmm } from '../lib/useTrip'
import type { Context, HiiragiMode } from '../types'

const MODES: { id: HiiragiMode; label: string }[] = [
  { id: 'genki', label: '元気' },
  { id: 'sleepy', label: '眠い' },
  { id: 'asleep', label: '寝てる' },
  { id: 'justWoke', label: '起きた' },
]

const TEXT: Record<HiiragiMode, string> = {
  genki: '柊は元気です',
  sleepy: '柊は眠そうです',
  asleep: '柊は寝ています',
  justWoke: '柊が起きたところです',
}

type Props = {
  ctx: Context
  onChange: (m: HiiragiMode) => void
}

export default function KidBar({ ctx, onChange }: Props) {
  const forecast = wakeForecast(ctx)
  const asking = shouldAskSleepy(ctx)

  // 「いま寝かせる」と「もう少しもたせる」で起床時刻がどう動くか。
  // 寝かせるタイミングは選べる、という前提の表示。
  const plan = ctx.hiiragi === 'sleepy' ? napPlan(ctx, 30) : null

  return (
    <>
      <div className={`kid kid--${ctx.hiiragi}`}>
        <div className="kid__row">
          <span className="kid__dot" />
          <span className="kid__text">{TEXT[ctx.hiiragi]}</span>
        </div>

        {forecast && (
          <p className="kid__sub">
            {forecast.sleptMin}分たちました。あと{forecast.minRemain}〜{forecast.maxRemain}
            分で起きます
          </p>
        )}

        {plan && (
          <p className="kid__sub">
            いま寝かせると{hhmm(plan.wakeIfNow)}、30分もたせると{hhmm(plan.wakeIfLater)}に起きます
          </p>
        )}

        <div className="kid__btns">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className="kid__btn"
              aria-pressed={ctx.hiiragi === m.id}
              onClick={() => onChange(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {asking && (
        <div className="body">
          <div className="ask">
            <p className="ask__q">そろそろ眠くなる時間です</p>
            <p className="ask__sub">
              起きてから
              {ctx.morningWokeAt
                ? Math.floor((ctx.now.getTime() - ctx.morningWokeAt.getTime()) / 3600000)
                : '—'}
              時間たちました。柊はどうですか？
            </p>
            <div className="ask__btns">
              <button type="button" className="ask__btn" onClick={() => onChange('sleepy')}>
                眠そう
              </button>
              <button type="button" className="ask__btn" onClick={() => onChange('genki')}>
                まだ元気
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
