import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LEAVE, STORAGE_KEY } from '../config'
import { BY_ID } from '../data/facilities'
import type { AreaId, Context, HiiragiMode, Wait } from '../types'
import { readStorage, writeStorage } from './storage'
import { type AutoWaits, fetchAutoWaits, mergeWaits } from './waits'

export type TripState = {
  /** 'YYYY-MM-DD'。日付が変わったら記録を捨てるために持つ */
  day: string
  area: AreaId
  /** ISO文字列。Dateはそのまま保存できないため */
  lastSeatedAt: string | null
  hiiragi: HiiragiMode
  sleptAt: string | null
  morningWokeAt: string | null
  /** 'HH:mm' */
  leaveAt: string
  /** 行った、または捨てたもの。以降の計算から外れる */
  done: string[]
  /** そのうち「捨てた」もの。行ったものと区別して表示するために持つ */
  skipped: string[]
  must: string[]
  /** 手入力ぶんだけ。自動取得は別に持ち、表示時に混ぜる */
  waits: Record<string, Wait>
}

function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const INITIAL: TripState = {
  day: todayKey(),
  area: 'bazaar',
  lastSeatedAt: null,
  hiiragi: 'genki',
  sleptAt: null,
  morningWokeAt: null,
  leaveAt: DEFAULT_LEAVE,
  done: [],
  skipped: [],
  // 本人が「行きたい」と言ったもの。効率で却下されない枠
  must: ['jungle'],
  waits: {},
}

/**
 * 保存データを読む。
 *
 * 前日に動作確認したときの記録がそのまま残っていると、当日の朝に
 * 「柊は寝ている」「もう回った」状態から始まり、提案が黙って狂う。
 * 日付が変わっていたら中身を捨てる。
 */
function load(): TripState {
  const raw = readStorage(STORAGE_KEY)
  const today = todayKey()
  if (!raw) return { ...INITIAL, day: today }
  try {
    const saved = { ...INITIAL, ...(JSON.parse(raw) as Partial<TripState>) }
    return saved.day === today ? saved : { ...INITIAL, day: today }
  } catch {
    return { ...INITIAL, day: today }
  }
}

/** 'HH:mm' を今日のDateにする */
export function todayAt(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

/** 予定表と桁をそろえるため、時も2桁にする */
export function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 自動取得の状態。まだ来ていないのと、失敗したのを混ぜない */
export type AutoStatus = 'loading' | 'ok' | 'failed'

/** 直前の操作。取り消し帯を出すために覚えておく（保存はしない） */
type LastAction = {
  id: string
  kind: 'go' | 'skip'
  at: number
  /** 押す直前の状態まるごと。戻すときはこれに差し替える */
  prev: TripState
}

/** 取り消し帯を出しておく時間 */
export const UNDO_WINDOW_MS = 90_000

export function useTrip() {
  const [state, setState] = useState<TripState>(load)
  // 30秒ごとに現在時刻を進める。提案は時刻で変わるので画面も追従させる
  const [now, setNow] = useState(() => new Date())
  const [auto, setAuto] = useState<AutoWaits | null>(null)
  const [autoStatus, setAutoStatus] = useState<AutoStatus>('loading')
  const [lastAction, setLastAction] = useState<LastAction | null>(null)

  useEffect(() => {
    writeStorage(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  /**
   * 時計と自動取得。
   *
   * iPhoneはアプリを裏に回すとタイマーが止まる。ポケットから出した直後に
   * 古い時刻と古い待ち時間のまま「遅れています」と判断されるのを防ぐため、
   * 画面が戻ってきた時点でも取り直す。
   */
  useEffect(() => {
    const ac = new AbortController()

    const fetchWaits = () => {
      void fetchAutoWaits(ac.signal).then((r) => {
        if (ac.signal.aborted) return
        if (r) {
          setAuto(r)
          setAutoStatus('ok')
        } else {
          // 一度でも取れていれば、その値を残したまま状態だけ落とす
          setAutoStatus((s) => (s === 'ok' ? 'ok' : 'failed'))
        }
      })
    }

    const tick = () => setNow(new Date())
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      tick()
      fetchWaits()
    }

    fetchWaits()
    const clockId = window.setInterval(tick, 30_000)
    const fetchId = window.setInterval(fetchWaits, 5 * 60_000)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      ac.abort()
      clearInterval(clockId)
      clearInterval(fetchId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const patch = useCallback((p: Partial<TripState>) => {
    setState((s) => ({ ...s, ...p }))
  }, [])

  /**
   * 「ここに行く」を押したとき。
   * これ1回で現在地と最後に座った時刻が同時に決まるのが入力設計の肝。
   *
   * 着席時刻は押した瞬間ではなく、待ち時間ぶん先に置く。
   * 60分並ぶものを押した瞬間に「座った」ことにすると、
   * 90分ルールがまるごと1時間ずれてしまうため。
   */
  // 更新関数の中で setLastAction を呼ぶと、StrictModeで2回走ったときに
  // 副作用が二重になる。いまの state を直接読んで、純粋な差し替えにする。
  const goTo = useCallback(
    (id: string, waitMin = 0) => {
      const f = BY_ID[id]
      if (!f) return
      const at = new Date()
      const seatedAt = new Date(at.getTime() + waitMin * 60_000)
      setLastAction({ id, kind: 'go', at: at.getTime(), prev: state })
      setState({
        ...state,
        area: f.area,
        done: state.done.includes(id) ? state.done : [...state.done, id],
        lastSeatedAt: f.seatedMin >= 10 ? seatedAt.toISOString() : state.lastSeatedAt,
      })
      setNow(at)
    },
    [state],
  )

  const setHiiragi = useCallback((mode: HiiragiMode) => {
    const at = new Date().toISOString()
    setState((s) => ({
      ...s,
      hiiragi: mode,
      sleptAt: mode === 'asleep' ? (s.hiiragi === 'asleep' ? s.sleptAt : at) : null,
    }))
  }, [])

  const setWait = useCallback((id: string, min: number, open: boolean) => {
    setState((s) => ({
      ...s,
      waits: {
        ...s.waits,
        [id]: { min, open, at: new Date().toISOString(), source: 'manual' },
      },
    }))
  }, [])

  /** 手入力を取り消して自動取得の値に戻す。押し間違えたときの逃げ道 */
  const clearWait = useCallback((id: string) => {
    setState((s) => {
      const { [id]: _removed, ...rest } = s.waits
      return { ...s, waits: rest }
    })
  }, [])

  const toggleMust = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      must: s.must.includes(id) ? s.must.filter((x) => x !== id) : [...s.must, id],
    }))
  }, [])

  /**
   * 予定を捨てる。以降の計算から外すだけで、
   * 現在地も最後に座った時刻も動かさない（そこへは行っていないため）。
   */
  const skip = useCallback(
    (id: string) => {
      if (state.done.includes(id)) return
      setLastAction({ id, kind: 'skip', at: Date.now(), prev: state })
      setState({ ...state, done: [...state.done, id], skipped: [...state.skipped, id] })
    },
    [state],
  )

  const undo = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      done: s.done.filter((x) => x !== id),
      skipped: s.skipped.filter((x) => x !== id),
    }))
    setLastAction((a) => (a?.id === id ? null : a))
  }, [])

  /** 直前の操作をまるごと戻す。押し間違えた直後のための一手 */
  const undoLast = useCallback(() => {
    if (!lastAction) return
    setState(lastAction.prev)
    setLastAction(null)
  }, [lastAction])

  const dismissLast = useCallback(() => setLastAction(null), [])

  const reset = useCallback(() => {
    setState({ ...INITIAL, day: todayKey() })
    setLastAction(null)
  }, [])

  const ctx: Context = useMemo(
    () => ({
      now,
      area: state.area,
      lastSeatedAt: state.lastSeatedAt ? new Date(state.lastSeatedAt) : null,
      hiiragi: state.hiiragi,
      sleptAt: state.sleptAt ? new Date(state.sleptAt) : null,
      morningWokeAt: state.morningWokeAt ? new Date(state.morningWokeAt) : null,
      leaveAt: todayAt(state.leaveAt),
      waits: mergeWaits(auto?.waits, state.waits, now),
      done: state.done,
      must: state.must,
    }),
    [now, state, auto],
  )

  const pendingUndo =
    lastAction && now.getTime() - lastAction.at < UNDO_WINDOW_MS ? lastAction : null

  return {
    state,
    ctx,
    now,
    auto,
    autoStatus,
    pendingUndo,
    patch,
    goTo,
    setHiiragi,
    setWait,
    clearWait,
    toggleMust,
    skip,
    undo,
    undoLast,
    dismissLast,
    reset,
  }
}
