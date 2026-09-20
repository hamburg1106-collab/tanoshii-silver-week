import { BY_ID } from '../data/facilities'
import { ENTRY_TIME, LEFT_OUT, PLAN } from '../data/plan'
import type { Access, Context, Facility } from '../types'

/**
 * 「予定の施設に行くために、いつ何をすればいいか」を出す。
 *
 * 待ち時間を見るだけでは足りない。プーさんもパレードも、動く時刻を逃すと
 * その日はもう手が無くなる。当日その場で調べるのでは遅いので、
 * 事前に分かっているルールをここに固めておく。
 *
 * 根拠（公式FAQ・2026-09-20 時点）:
 * - DPAは入園後（入園のQRを読ませたあと）でないと買えない
 * - 次のDPAは「購入から60分後」か「利用開始時刻」の早い方で買える
 * - **アトラクション枠とショー枠は別カウントなので同時に持てる**
 */

/** DPAを続けて買えるようになるまでの分数 */
export const DPA_COOLDOWN_MIN = 60

export type Urgency = 'now' | 'blocked' | 'later' | 'missed'

export type TodoAction = {
  facility: Facility
  access: Access
  label: string
  detail: string
  urgency: Urgency
  reason: string
  /** blocked のとき、いつから買えるか */
  availableFrom?: Date
}

function todayAt(base: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

function yenLabel(a: Access): string {
  if (a.yen == null) return '価格はアプリで確認'
  return `1人 ${a.yen.toLocaleString()}円`
}

/**
 * @param secured 確保済みの手配。施設id → 確保した時刻(ISO)
 */
export function todoActions(ctx: Context, secured: Record<string, string>): TodoAction[] {
  // 時計ではなく「入園した」を押したかどうかで判定する。
  // ゲートで待たされている間に「いま買えます」と出すのが、いちばん困る嘘なので。
  const inPark = ctx.enteredAt != null
  // 予定時刻を過ぎているのに押されていないなら、押し忘れの可能性が高い
  const overdue = !inPark && ctx.now >= todayAt(ctx.now, ENTRY_TIME)
  const notYet = overdue
    ? '「入園した」を押すと、ここに手順が出ます'
    : `入園しないと動かせません（予定は${ENTRY_TIME}）`

  // 枠ごとに、直近で確保したDPAの時刻を拾う。
  // 60分のしばりは枠ごとに別々にかかる
  const lastByLane: Record<string, Date> = {}
  for (const [id, iso] of Object.entries(secured)) {
    const lane = BY_ID[id]?.access?.lane
    if (!lane) continue
    const at = new Date(iso)
    if (Number.isNaN(at.getTime())) continue
    if (!lastByLane[lane] || at > lastByLane[lane]) lastByLane[lane] = at
  }

  const out: TodoAction[] = []

  // 予定に載っているものに加えて、「絶対行く」に指定したものも対象にする。
  // 予定外でもマストにしたなら、手配の要否は知りたい。
  //
  // 予定から落としたものでも、**抽選だけは対象に戻す**。
  // 無料で、1日1回きりで、当たれば予定を組み替える価値がある。
  // 引かない理由が無いものを、予定に無いという理由だけで隠すのは間違い。
  const lotteries = LEFT_OUT.filter((x) => BY_ID[x.facilityId]?.access?.kind === 'entry').map(
    (x) => x.facilityId,
  )
  const ids = [...new Set([...PLAN.map((p) => p.facilityId), ...ctx.must, ...lotteries])]

  for (const id of ids) {
    const f = id ? BY_ID[id] : undefined
    const a = f?.access
    if (!f || !a) continue
    // 確保済み・行った・捨てたものは出さない
    if (secured[f.id] || ctx.done.includes(f.id)) continue

    // やれる時間が終わっていたら、もう手の打ちようがない
    if (f.window && ctx.now > todayAt(ctx.now, f.window.to)) {
      out.push({
        facility: f,
        access: a,
        label: `${f.name}`,
        detail: yenLabel(a),
        urgency: 'missed',
        reason: '時間が過ぎました',
      })
      continue
    }

    if (a.kind === 'ps') {
      out.push({
        facility: f,
        access: a,
        label: `${f.name}の席を押さえる`,
        detail: '幼児も人数に入れて予約すること',
        urgency: 'now',
        reason: a.hint,
      })
      continue
    }

    // エントリー受付は60分のしばりが無い。かわりに1日1回きりなので、
    // 「入園したら真っ先に引く」以外に正解が無い。だから常に最優先で出す。
    if (a.kind === 'entry') {
      out.push({
        facility: f,
        access: a,
        label: `${f.name}の抽選を引く`,
        detail: '無料・1日1回きり',
        urgency: inPark ? 'now' : 'later',
        reason: inPark ? a.hint : notYet,
      })
      continue
    }

    // ── ここからDPA ──
    const label = `${f.name}のDPAを買う`
    const lane = a.lane === 'show' ? 'ショー枠' : 'アトラクション枠'
    const detail = `${yenLabel(a)}・${lane}`

    if (!inPark) {
      out.push({
        facility: f,
        access: a,
        label,
        detail,
        urgency: 'later',
        reason: notYet,
      })
      continue
    }

    const last = a.lane ? lastByLane[a.lane] : undefined
    const openAt = last ? new Date(last.getTime() + DPA_COOLDOWN_MIN * 60_000) : null

    if (openAt && ctx.now < openAt) {
      out.push({
        facility: f,
        access: a,
        label,
        detail,
        urgency: 'blocked',
        availableFrom: openAt,
        reason: `同じ枠のDPAを買ったばかりです。利用開始時刻が先に来れば、その時点で買えます`,
      })
      continue
    }

    out.push({
      facility: f,
      access: a,
      label,
      detail,
      urgency: 'now',
      reason: a.hint,
    })
  }

  // 急ぐものから。同じ強さなら、取り返しのつかない方を先に。
  // 抽選は1日1回きりで金でも解決できないので、DPAより必ず上に置く。
  const rank: Record<Urgency, number> = { now: 0, blocked: 1, later: 2, missed: 3 }
  const kindRank = { entry: 0, ps: 1, dpa: 2 } as const
  const riskRank = { high: 0, mid: 1, low: 2 } as const
  return out.sort(
    (x, y) =>
      rank[x.urgency] - rank[y.urgency] ||
      kindRank[x.access.kind] - kindRank[y.access.kind] ||
      riskRank[x.access.risk] - riskRank[y.access.risk],
  )
}

/**
 * いま同時に買えるDPAが、別々の枠にまたがっているか。
 * またがっていれば片方を待つ必要がないので、それを画面で言う価値がある。
 */
export function hasBothLanesNow(actions: TodoAction[]): boolean {
  const lanes = new Set(
    actions.filter((a) => a.urgency === 'now' && a.access.kind === 'dpa').map((a) => a.access.lane),
  )
  return lanes.has('attraction') && lanes.has('show')
}
