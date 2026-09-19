import { walkMinutes } from '../data/areas'
import { BY_ID } from '../data/facilities'
import { PLAN, PLANNED_NAP, type PlanItem } from '../data/plan'
import { dwellMinutes, waitOf } from './suggest'
import type { AreaId, Context, Facility } from '../types'

/**
 * 予定と実際のズレを測る。
 *
 * 大事なのは「遅れています」と言うことではなく、
 * **このままだと何が落ちるかを先に見せて、捨てるものを選ばせる**こと。
 * 当日その判断を迫られる前に教えるのが、このアプリの一番の仕事。
 */

export type PlanRow = {
  item: PlanItem
  facility?: Facility
  done: boolean
  plannedAt: Date
  /**
   * このまま進んだ場合に「乗れる・入れる」予測時刻。
   * 移動＋待ちまでを含み、体験そのものの時間は含まない。
   * 予定表の時刻は開始時刻なので、比べる相手をそろえないとズレが二重に膨らむ。
   */
  eta?: Date
  /** 予測が予定から何分ずれるか。正なら遅れ */
  etaDriftMin?: number
  /** 残り時間に収まるか */
  fits: boolean
}

export type Review = {
  rows: PlanRow[]
  /** 次にやる予定に対して何分遅れているか。正なら遅れ */
  driftMin: number
  /** 次にやる予定 */
  next?: PlanItem
  /** このままだと入らないもの */
  wontFit: PlanRow[]
  /** 昼寝が予定とずれているか */
  napNote: string | null
}

function todayAt(base: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

export function reviewPlan(ctx: Context): Review {
  const rows: PlanRow[] = []

  // 現在地と現在時刻から、予定の順に回っていったらどうなるかを積み上げる
  let cursor = new Date(ctx.now)
  let area: AreaId = ctx.area

  for (const item of PLAN) {
    const f = item.facilityId ? BY_ID[item.facilityId] : undefined
    const plannedAt = todayAt(ctx.now, item.time)
    const done = item.facilityId ? ctx.done.includes(item.facilityId) : false

    if (done || !f) {
      rows.push({ item, facility: f, done, plannedAt, fits: true })
      continue
    }

    const { min: waitMin, open } = waitOf(f, ctx)
    // 乗れる時刻（移動＋待ち）と、終わる時刻（＋体験時間）を分ける
    const eta = new Date(cursor.getTime() + (walkMinutes(area, f.area) + waitMin) * 60000)
    const finish = new Date(eta.getTime() + dwellMinutes(f) * 60000)

    // 終えたあと、入口まで戻る時間が残っているか
    const backMin = walkMinutes(f.area, 'bazaar')
    const inTime = finish.getTime() + backMin * 60000 <= ctx.leaveAt.getTime()
    // パレードや食事には終わりの時刻がある。
    // 遅れて着いても「間に合う」と表示してしまうので、ここで落とす。
    const windowOk = !f.window || eta <= todayAt(ctx.now, f.window.to)
    const fits = open && inTime && windowOk

    rows.push({
      item,
      facility: f,
      done: false,
      plannedAt,
      eta,
      etaDriftMin: Math.round((eta.getTime() - plannedAt.getTime()) / 60000),
      fits,
    })

    // 入らないものは飛ばす前提なので、時計もその場所も進めない
    if (fits) {
      cursor = finish
      area = f.area
    }
  }

  // 見出しのズレは、次の予定に「いま何分遅れて着手したか」ではなく
  // 「待ち時間まで含めて実際に何分遅れて乗れるか」で出す。
  // 前者だと待ち60分の列に並ぶ直前でも「5分遅れ」と表示されてしまう。
  const nextRow = rows.find((r) => !r.done && r.facility)
  const driftMin = nextRow?.etaDriftMin ?? 0

  return {
    rows,
    driftMin,
    next: nextRow?.item,
    wontFit: rows.filter((r) => !r.done && r.facility && !r.fits),
    napNote: napNote(ctx),
  }
}

/** 昼寝が予定（13:00〜15:00）からずれているときだけ一言返す */
function napNote(ctx: Context): string | null {
  const from = todayAt(ctx.now, PLANNED_NAP.from)
  const to = todayAt(ctx.now, PLANNED_NAP.to)

  if (ctx.hiiragi === 'asleep' && ctx.sleptAt) {
    const late = Math.round((ctx.sleptAt.getTime() - from.getTime()) / 60000)
    if (late > 30) return `昼寝が予定より${late}分おそく始まりました。午後が後ろにずれます`
    if (late < -30) return `昼寝が予定より${-late}分はやく始まりました。早めに起きます`
    return null
  }

  // 昼寝の時間帯なのに起きている
  if (ctx.now > from && ctx.now < to && ctx.hiiragi === 'genki') {
    const over = Math.round((ctx.now.getTime() - from.getTime()) / 60000)
    if (over > 45) {
      return `昼寝の時間を${over}分すぎても寝ていません。夕方に限界が来るかもしれません`
    }
  }

  // 昼寝の時間帯が終わる前に起きた
  if (ctx.hiiragi === 'justWoke' && ctx.now < to) {
    const early = Math.round((to.getTime() - ctx.now.getTime()) / 60000)
    if (early > 30) return `予定より${early}分はやく起きました。ぐずるかもしれません`
  }

  return null
}
