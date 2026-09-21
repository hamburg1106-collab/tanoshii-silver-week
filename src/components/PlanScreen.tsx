import { BY_ID } from '../data/facilities'
import { LEFT_OUT } from '../data/plan'
import type { TodoAction } from '../lib/actions'
import type { Review } from '../lib/drift'
import { hhmm } from '../lib/useTrip'
import type { Secured } from '../types'
import TodoList from './TodoList'

type Props = {
  review: Review
  /** 捨てたもののid。行ったものと区別して出す */
  skipped: string[]
  todos: TodoAction[]
  secured: Record<string, Secured>
  failed: string[]
  onSecured: (id: string) => void
  onFailed: (id: string) => void
  onUseAt: (id: string, useAt: string) => void
  onClearAccess: (id: string) => void
  onSkip: (id: string) => void
  onUndo: (id: string) => void
}

export default function PlanScreen({
  review,
  skipped,
  todos,
  secured,
  failed,
  onSecured,
  onFailed,
  onUseAt,
  onClearAccess,
  onSkip,
  onUndo,
}: Props) {
  return (
    <div className="body">
      {(todos.length > 0 || Object.keys(secured).length > 0 || failed.length > 0) && (
        <div className="section">
          <p className="section__label">行くためにやること</p>
          <p className="hint">
            並ぶだけで入れるものは出ません。手配が要るものだけです。
          </p>
          <TodoList
            actions={todos}
            secured={secured}
            failed={failed}
            onSecured={onSecured}
            onFailed={onFailed}
            onUseAt={onUseAt}
            onClear={onClearAccess}
          />
        </div>
      )}

      <div className="section">
        <p className="section__label">もとの予定と、いまの見込み</p>

        <div className="plan">
          {review.rows.map((r) => {
            const id = r.facility?.id
            const wasSkipped = id != null && skipped.includes(id)
            const state = !r.facility
              ? 'plain'
              : wasSkipped
                ? 'skipped'
                : r.done
                  ? 'done'
                  : r.fits
                    ? 'todo'
                    : 'out'

            return (
              <div className={`prow prow--${state}`} key={r.item.time + r.item.label}>
                <div className="prow__time">{r.item.time}</div>

                <div className="prow__main">
                  <div className="prow__label">{r.item.label}</div>

                  {wasSkipped && <div className="prow__note prow__note--skipped">捨てました</div>}

                  {r.done && !wasSkipped && (
                    <div className="prow__note prow__note--done">すみました</div>
                  )}

                  {!r.done && r.eta && r.fits && (
                    <div className="prow__note">
                      いま向かうと {hhmm(r.eta)} 着
                      {r.etaDriftMin != null && r.etaDriftMin > 5 && (
                        <span className="prow__late"> ＋{r.etaDriftMin}分</span>
                      )}
                    </div>
                  )}

                  {!r.done && r.facility && !r.fits && (
                    <div className="prow__note prow__note--out">このままだと入りません</div>
                  )}
                </div>

                {/*
                  捨てるのに確認ダイアログは挟まない。
                  歩きながら使うので、押したあとその場で戻せる方が速くて確実。
                */}
                {id != null &&
                  (r.done ? (
                    <button type="button" className="prow__act" onClick={() => onUndo(id)}>
                      戻す
                    </button>
                  ) : (
                    <button type="button" className="prow__act" onClick={() => onSkip(id)}>
                      捨てる
                    </button>
                  ))}
              </div>
            )
          })}
        </div>
      </div>

      <p className="hint hint--center">
        「捨てる」を押しても、同じ行の「戻す」でいつでも元に戻せます。
      </p>

      {/*
        入らなかったものを理由つきで残す。
        早く回れた日に「じゃあ何を足す？」をその場で決められるようにするため。
      */}
      <div className="section">
        <p className="section__label">今回は入らなかったもの</p>
        <p className="hint">予定より早く回れたら、ここから足せます。</p>
        <div className="outs">
          {LEFT_OUT.map((o) => (
            <div className="out" key={o.facilityId}>
              <div className="out__name">{BY_ID[o.facilityId]?.name ?? o.facilityId}</div>
              <div className="out__why">{o.why}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
