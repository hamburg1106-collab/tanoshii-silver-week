import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LEAVE, STORAGE_KEY } from '../config'
import { BY_ID } from '../data/facilities'
import type { AreaId, Context, HiiragiMode, Wait } from '../types'
import { readStorage, writeStorage } from './storage'

export type TripState = {
  area: AreaId
  /** ISO文字列。Dateはそのまま保存できないため */
  lastSeatedAt: string | null
  hiiragi: HiiragiMode
  sleptAt: string | null
  morningWokeAt: string | null
  /** 'HH:mm' */
  leaveAt: string
  done: string[]
  must: string[]
  waits: Record<string, Wait>
}

const INITIAL: TripState = {
  area: 'bazaar',
  lastSeatedAt: null,
  hiiragi: 'genki',
  sleptAt: null,
  morningWokeAt: null,
  leaveAt: DEFAULT_LEAVE,
  done: [],
  // 本人が「行きたい」と言ったもの。効率で却下されない枠
  must: ['jungle'],
  waits: {},
}

function load(): TripState {
  const raw = readStorage(STORAGE_KEY)
  if (!raw) return INITIAL
  try {
    return { ...INITIAL, ...(JSON.parse(raw) as Partial<TripState>) }
  } catch {
    return INITIAL
  }
}

/** 'HH:mm' を今日のDateにする */
export function todayAt(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

export function hhmm(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function useTrip() {
  const [state, setState] = useState<TripState>(load)
  // 30秒ごとに現在時刻を進める。提案は時刻で変わるので画面も追従させる
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    writeStorage(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const patch = useCallback((p: Partial<TripState>) => {
    setState((s) => ({ ...s, ...p }))
  }, [])

  /**
   * 「行く」を押したとき。
   * これ1回で現在地と最後に座った時刻が同時に決まるのが入力設計の肝。
   */
  const goTo = useCallback((id: string) => {
    const f = BY_ID[id]
    if (!f) return
    const at = new Date()
    setState((s) => ({
      ...s,
      area: f.area,
      done: s.done.includes(id) ? s.done : [...s.done, id],
      lastSeatedAt: f.seatedMin >= 10 ? at.toISOString() : s.lastSeatedAt,
    }))
    setNow(at)
  }, [])

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

  const toggleMust = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      must: s.must.includes(id) ? s.must.filter((x) => x !== id) : [...s.must, id],
    }))
  }, [])

  const undo = useCallback((id: string) => {
    setState((s) => ({ ...s, done: s.done.filter((x) => x !== id) }))
  }, [])

  const reset = useCallback(() => setState(INITIAL), [])

  const ctx: Context = useMemo(
    () => ({
      now,
      area: state.area,
      lastSeatedAt: state.lastSeatedAt ? new Date(state.lastSeatedAt) : null,
      hiiragi: state.hiiragi,
      sleptAt: state.sleptAt ? new Date(state.sleptAt) : null,
      morningWokeAt: state.morningWokeAt ? new Date(state.morningWokeAt) : null,
      leaveAt: todayAt(state.leaveAt),
      waits: state.waits,
      done: state.done,
      must: state.must,
    }),
    [now, state],
  )

  return { state, ctx, now, patch, goTo, setHiiragi, setWait, toggleMust, undo, reset }
}
