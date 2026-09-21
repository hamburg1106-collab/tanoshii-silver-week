import { useState } from 'react'
import KidBar from './components/KidBar'
import NextCard from './components/NextCard'
import PlanScreen from './components/PlanScreen'
import SettingsScreen from './components/SettingsScreen'
import TodoList from './components/TodoList'
import WaitScreen from './components/WaitScreen'
import { APP_NAME, ATTRIBUTION } from './config'
import { AREA_NAME } from './data/areas'
import { BY_ID } from './data/facilities'
import { slotWarnings, todoActions } from './lib/actions'
import { reviewPlan } from './lib/drift'
import { mustWarnings, suggest } from './lib/suggest'
import { hhmm, useTrip } from './lib/useTrip'

type Tab = 'now' | 'plan' | 'wait' | 'set'

const TABS: { id: Tab; label: string }[] = [
  { id: 'now', label: 'いま' },
  { id: 'plan', label: 'よてい' },
  { id: 'wait', label: '待ち時間' },
  { id: 'set', label: '設定' },
]

/**
 * 「古い」と言い出すまでの分数。
 * Actionsのcronは数分ずれるうえ、rawにも5分のキャッシュがある。
 * 短くしすぎると、正常に動いていても警告が点きっぱなしになって意味を失う。
 */
const STALE_MIN = 25

export default function App() {
  const [tab, setTab] = useState<Tab>('now')
  const {
    state,
    ctx,
    now,
    auto,
    autoStatus,
    pendingUndo,
    patch,
    goTo,
    enter,
    setHiiragi,
    setWait,
    clearWait,
    toggleMust,
    markSecured,
    setUseAt,
    markFailed,
    clearAccess,
    skip,
    undo,
    undoLast,
    dismissLast,
    reset,
  } = useTrip()

  const list = suggest(ctx)
  const best = list[0]
  const alts = list.slice(1, 5)
  // 締切が近い順。ok は出さない（出すと警告が常時光って効かなくなる）
  const warns = mustWarnings(ctx).filter((w) => w.level !== 'ok')
  const review = reviewPlan(ctx)
  const late = review.driftMin > 10
  const todos = todoActions(ctx, state.secured, state.failed)
  // 買った枠を時間切れで捨てるのが一番もったいないので、警告より上に出す
  const slots = slotWarnings(ctx, state.secured)

  const autoAgeMin = auto ? Math.round((now.getTime() - auto.at.getTime()) / 60000) : null
  const stale = autoAgeMin != null && autoAgeMin > STALE_MIN
  const freshOff = autoStatus === 'failed' || stale

  const setWokeNow = (v: string) => {
    if (!v) return patch({ morningWokeAt: null })
    const [h, m] = v.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    patch({ morningWokeAt: d.toISOString() })
  }

  return (
    <div className="app">
      <header className="head">
        <h1 className="head__title">{APP_NAME}</h1>
        <div className="head__meta">
          <span className="head__clock">{hhmm(now)}</span>
          <span className="head__where">{AREA_NAME[state.area]}</span>
        </div>
      </header>

      <KidBar ctx={ctx} onChange={setHiiragi} />

      <div className="body">
        <p className={`fresh ${freshOff ? 'fresh--off' : ''}`}>
          {autoStatus === 'loading' && autoAgeMin == null
            ? '待ち時間を取りに行っています…'
            : autoAgeMin == null
              ? '待ち時間が自動で取れません。手で入れてください'
              : stale
                ? `待ち時間は${autoAgeMin}分前のデータです。古いかもしれません`
                : `待ち時間は${autoAgeMin}分前のデータです`}
        </p>

        {/* 押し間違えた直後にその場で戻せるようにする。設定タブまで行かせない */}
        {pendingUndo && (
          <div className="undo">
            <span className="undo__text">
              {BY_ID[pendingUndo.id]?.name ?? pendingUndo.id}を
              {pendingUndo.kind === 'go' ? '記録しました' : '捨てました'}
            </span>
            <button type="button" className="undo__btn" onClick={undoLast}>
              取り消す
            </button>
            <button
              type="button"
              className="undo__close"
              aria-label="閉じる"
              onClick={dismissLast}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {tab === 'now' && (
        <div className="body">
          {/*
            入園したかどうかは時計では分からない。ゲートで待たされた日ほど
            「いま買えます」の嘘が痛いので、押してもらう。
            押されるまで手配の案内は解禁しない。
          */}
          {!state.enteredAt ? (
            <button type="button" className="gate" onClick={enter}>
              <span className="gate__big">入園した</span>
              <span className="gate__sub">
                押すと、抽選とDPAの手順が出ます。
                <br />
                ゲートを通ってから押してください
              </span>
            </button>
          ) : (
            <p className="gate__done">
              {hhmm(new Date(state.enteredAt))} 入園
              <button type="button" className="gate__undo" onClick={enter}>
                取り消す
              </button>
            </p>
          )}

          {/*
            眠気の予告はこのアプリの目玉だが、起床時刻が空だと一度も出ない。
            設定タブまで行かないと気づけないので、ここで直接入れられるようにする。
          */}
          {!state.morningWokeAt && (
            <div className="prompt">
              <p className="prompt__q">柊は今朝、何時に起きましたか？</p>
              <p className="prompt__sub">
                入れておくと、眠くなる時間をアプリの方から先に知らせます
              </p>
              <input
                className="prompt__input"
                type="time"
                aria-label="柊が今朝起きた時刻"
                onChange={(e) => setWokeNow(e.target.value)}
              />
            </div>
          )}

          <div className={`drift ${late ? 'drift--late' : 'drift--ontime'}`}>
            <div className="drift__big">
              {late
                ? `予定より ${review.driftMin}分 おくれています`
                : review.driftMin < -10
                  ? `予定より ${-review.driftMin}分 はやいです`
                  : '予定どおりです'}
            </div>
            {review.next && <p className="drift__sub">つぎの予定：{review.next.label}</p>}

            {review.wontFit.length > 0 && (
              <div className="drift__out">
                このままだと {review.wontFit.length}つ 入りません
                {review.wontFit.map((r) => (
                  <div key={r.item.label}>・{r.item.label}</div>
                ))}
                <div className="drift__hint">「よてい」で捨てるものを選べます</div>
              </div>
            )}

            {review.napNote && <p className="drift__nap">{review.napNote}</p>}
          </div>

          {/* 金を払った枠が消えるのが一番痛いので、他の警告より前に出す */}
          {slots.map((s) => (
            <div
              className={`slot ${s.slackMin <= 0 ? 'slot--late' : ''}`}
              key={s.facility.id}
            >
              {s.message}
            </div>
          ))}

          {warns.map((w) => (
            <div className={`warn warn--${w.level}`} key={w.facility.id}>
              {w.message}
            </div>
          ))}

          {/* 急ぎの手配だけ。全部は「よてい」に出す */}
          <TodoList
            actions={todos}
            secured={state.secured}
            failed={state.failed}
            onSecured={markSecured}
            onFailed={markFailed}
            onUseAt={setUseAt}
            onClear={clearAccess}
            compact
          />

          <div className="section">
            <p className="section__label">つぎ、ここ</p>
            {best ? (
              <NextCard s={best} onGo={goTo} />
            ) : (
              <div className="empty">
                いまの条件だと候補がありません。
                <br />
                設定で退園時刻を延ばすか、待ち時間を入れ直してください。
              </div>
            )}
          </div>

          {alts.length > 0 && (
            <div className="section">
              <p className="section__label">ほかの候補</p>
              <div className="alts">
                {alts.map((s) => (
                  <button
                    type="button"
                    className="alt"
                    key={s.facility.id}
                    onClick={() => goTo(s.facility.id, s.waitMin)}
                  >
                    <span className="alt__main">
                      <span className="alt__name">{s.facility.name}</span>
                      <span className="alt__sub">
                        待ち{s.waitMin}分 ・ {s.walkM === 0 ? 'このエリア' : `${s.walkM}m`}
                      </span>
                    </span>
                    <span className="alt__go">行く</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'plan' && (
        <PlanScreen
          review={review}
          skipped={state.skipped}
          todos={todos}
          secured={state.secured}
          failed={state.failed}
          onSecured={markSecured}
          onFailed={markFailed}
          onUseAt={setUseAt}
          onClearAccess={clearAccess}
          onSkip={skip}
          onUndo={undo}
        />
      )}

      {tab === 'wait' && (
        <WaitScreen
          ctx={ctx}
          state={state}
          onSetWait={setWait}
          onClearWait={clearWait}
          onToggleMust={toggleMust}
        />
      )}

      {tab === 'set' && (
        <SettingsScreen
          state={state}
          onPatch={patch}
          onUndo={undo}
          onReset={reset}
        />
      )}

      {/* queue-times.com の利用条件。消さないこと */}
      <p className="credit">
        待ち時間のデータ提供：
        <a href={ATTRIBUTION.url} target="_blank" rel="noreferrer">
          {ATTRIBUTION.label}
        </a>
      </p>

      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="nav__btn"
            aria-current={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            <span className="nav__mark" />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
