import type { Review } from '../lib/drift'
import { hhmm } from '../lib/useTrip'

type Props = {
  review: Review
  /** 捨てたもののid。行ったものと区別して出す */
  skipped: string[]
  onSkip: (id: string) => void
  onUndo: (id: string) => void
}

export default function PlanScreen({ review, skipped, onSkip, onUndo }: Props) {
  return (
    <div className="body">
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
    </div>
  )
}
