import { BY_QT_ID } from '../data/facilities'
import type { Wait } from '../types'

/**
 * 自動取得した待ち時間の読み込み。
 *
 * GitHub Actions が5分おきに data ブランチへ置いたJSONを、rawから直接読む。
 * raw.githubusercontent.com は Access-Control-Allow-Origin: * を返すので
 * ブラウザから読める（queue-times を直接叩くとCORSで落ちる）。
 *
 * Pagesを再ビルドしないので、更新が届くのが速く、デプロイ履歴も汚れない。
 */
const DATA_URL =
  'https://raw.githubusercontent.com/hamburg1106-collab/tanoshii-silver-week/data/waits.json'

/** 手入力を優先しつづける時間。これを過ぎたら自動取得に戻す */
export const MANUAL_WINS_MIN = 30

type Payload = {
  at: string
  rides: { id: number; wait: number; open: boolean }[]
}

export type AutoWaits = {
  at: Date
  waits: Record<string, Wait>
}

export async function fetchAutoWaits(signal?: AbortSignal): Promise<AutoWaits | null> {
  try {
    const res = await fetch(DATA_URL, { signal, cache: 'no-cache' })
    if (!res.ok) return null
    const data = (await res.json()) as Payload
    if (!data?.rides?.length) return null

    const waits: Record<string, Wait> = {}
    for (const r of data.rides) {
      const f = BY_QT_ID[r.id]
      // こちらが持っていない施設は捨てる（37件のうち使うのは一部）
      if (!f) continue
      waits[f.id] = { min: r.wait, open: r.open, at: data.at, source: 'auto' }
    }
    return { at: new Date(data.at), waits }
  } catch {
    // 圏外でも落とさない。手入力と既定値で動きつづける
    return null
  }
}

/**
 * 自動取得と手入力を混ぜる。
 *
 * 手入力は「自分の目で見た」情報なので自動より強いが、放っておくと古びる。
 * 30分たったら自動に戻すことで、朝入れた数字が夕方まで居座るのを防ぐ。
 */
export function mergeWaits(
  auto: Record<string, Wait> | undefined,
  manual: Record<string, Wait>,
  now: Date,
): Record<string, Wait> {
  const out: Record<string, Wait> = { ...(auto ?? {}) }
  for (const [id, w] of Object.entries(manual)) {
    const ageMin = (now.getTime() - new Date(w.at).getTime()) / 60000
    if (ageMin <= MANUAL_WINS_MIN || !out[id]) out[id] = w
  }
  return out
}
