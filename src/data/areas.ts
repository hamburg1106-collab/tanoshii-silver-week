import type { AreaId } from '../types'

export const AREA_NAME: Record<AreaId, string> = {
  bazaar: 'ワールドバザール',
  plaza: 'プラザ',
  adventure: 'アドベンチャーランド',
  western: 'ウエスタンランド',
  critter: 'クリッターカントリー',
  fantasy: 'ファンタジーランド',
  toon: 'トゥーンタウン',
  tomorrow: 'トゥモローランド',
}

export const AREA_ORDER: AreaId[] = [
  'bazaar',
  'plaza',
  'adventure',
  'western',
  'critter',
  'fantasy',
  'toon',
  'tomorrow',
]

/**
 * 入口からの遠さ。0が入口。
 * 「入口から遠ざかる方向」への減点に使う。夕方ほど強く効かせる。
 */
export const EXIT_RANK: Record<AreaId, number> = {
  bazaar: 0,
  plaza: 1,
  adventure: 2,
  tomorrow: 2,
  western: 3,
  fantasy: 3,
  critter: 4,
  toon: 4,
}

/**
 * 隣り合うエリア間の徒歩距離（m・概算）。
 * 公式の距離表は無いので、園内マップから読んだおおよその値。
 * 絶対値の正確さより、エリア間の大小関係が合っていることを優先している。
 */
const EDGES: [AreaId, AreaId, number][] = [
  ['bazaar', 'plaza', 200],
  ['plaza', 'adventure', 200],
  ['plaza', 'tomorrow', 200],
  ['plaza', 'fantasy', 300],
  ['adventure', 'western', 200],
  ['western', 'critter', 200],
  // ウエスタンランドとファンタジーランドは城の左手で直接つながっている
  ['western', 'fantasy', 250],
  ['critter', 'fantasy', 250],
  ['fantasy', 'toon', 300],
  ['tomorrow', 'toon', 350],
  ['tomorrow', 'fantasy', 250],
]

const INF = Number.POSITIVE_INFINITY

/** 全エリア間の最短徒歩距離（m）。ワーシャル–フロイドで一度だけ作る */
export const AREA_DISTANCE: Record<AreaId, Record<AreaId, number>> = (() => {
  const d = {} as Record<AreaId, Record<AreaId, number>>
  for (const a of AREA_ORDER) {
    d[a] = {} as Record<AreaId, number>
    for (const b of AREA_ORDER) d[a][b] = a === b ? 0 : INF
  }
  for (const [a, b, m] of EDGES) {
    d[a][b] = Math.min(d[a][b], m)
    d[b][a] = Math.min(d[b][a], m)
  }
  for (const k of AREA_ORDER) {
    for (const i of AREA_ORDER) {
      for (const j of AREA_ORDER) {
        const via = d[i][k] + d[k][j]
        if (via < d[i][j]) d[i][j] = via
      }
    }
  }
  return d
})()

/** 徒歩の分数。高齢者同伴なので分速60m（ふつうは80m）で見積もる */
export const WALK_M_PER_MIN = 60

export function walkMinutes(from: AreaId, to: AreaId): number {
  return Math.round(AREA_DISTANCE[from][to] / WALK_M_PER_MIN)
}
