import type { Review } from '../lib/drift'
import { hhmm } from '../lib/useTrip'

type Props = {
  review: Review
  onSkip: (id: string) => void
}

export default function PlanScreen({ review, onSkip }: Props) {
  return (
    <div className="body">
      <div className="section">
        <p className="section__label">もとの予定と、いまの見込み</p>

        <div className="plan">
          {review.rows.map((r) => {
            const state = r.done ? 'done' : !r.facility ? 'plain' : r.fits ? 'todo' : 'out'
            return (
              <div className={`prow prow--${state}`} key={r.item.time + r.item.label}>
                <div className="prow__time">{r.item.time}</div>

                <div className="prow__main">
                  <div className="prow__label">{r.item.label}</div>

                  {r.done && <div className="prow__note prow__note--done">すみました</div>}

                  {!r.done && r.eta && r.fits && (
                    <div className="prow__note">
                      いま向かうと {hhmm(r.eta)} 着
                      {r.etaDriftMin != null && r.etaDriftMin > 5 && (
                        <span className="prow__late"> ＋{r.etaDriftMin}分</span>
                      )}
                    </div>
                  )}

                  {!r.done && r.facility && !r.fits && (
                    <div className="prow__note prow__note--out">
                      このままだと入りません
                    </div>
                  )}
                </div>

                {!r.done && r.facility && (
                  <button
                    type="button"
                    className="prow__skip"
                    onClick={() => onSkip(r.facility!.id)}
                  >
                    捨てる
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="credit">
        「捨てる」を押すと、まわった扱いにして以降の計算から外します。
        <br />
        設定画面から戻せます。
      </p>
    </div>
  )
}
