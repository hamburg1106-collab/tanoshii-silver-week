import { useState } from 'react'
import KidBar from './components/KidBar'
import NextCard from './components/NextCard'
import SettingsScreen from './components/SettingsScreen'
import WaitScreen from './components/WaitScreen'
import { APP_NAME, ATTRIBUTION } from './config'
import { AREA_NAME } from './data/areas'
import { mustWarnings, suggest } from './lib/suggest'
import { hhmm, useTrip } from './lib/useTrip'

type Tab = 'now' | 'wait' | 'set'

const TABS: { id: Tab; label: string }[] = [
  { id: 'now', label: 'いま' },
  { id: 'wait', label: '待ち時間' },
  { id: 'set', label: '設定' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('now')
  const { state, ctx, now, patch, goTo, setHiiragi, setWait, toggleMust, undo, reset } = useTrip()

  const list = suggest(ctx)
  const best = list[0]
  const alts = list.slice(1, 5)
  // 締切が近い順。ok は出さない（出すと警告が常時光って効かなくなる）
  const warns = mustWarnings(ctx).filter((w) => w.level !== 'ok')

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

      {tab === 'now' && (
        <div className="body">
          {warns.map((w) => (
            <div className={`warn warn--${w.level}`} key={w.facility.id}>
              {w.message}
            </div>
          ))}

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
                    onClick={() => goTo(s.facility.id)}
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

      {tab === 'wait' && (
        <WaitScreen state={state} onSetWait={setWait} onToggleMust={toggleMust} />
      )}

      {tab === 'set' && (
        <SettingsScreen state={state} onPatch={patch} onUndo={undo} onReset={reset} />
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
