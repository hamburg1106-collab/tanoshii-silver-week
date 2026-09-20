import { AREA_DISTANCE, EXIT_RANK, walkMinutes } from '../data/areas'
import { BY_ID, OPEN_FACILITIES } from '../data/facilities'
import type { Context, Facility, MustWarning, Suggestion } from '../types'

/**
 * 提案エンジン。
 *
 * 最適化するのは待ち時間ではなく「歩行と立ち時間を抑えつつ90分ごとに着席させること」。
 * ここを間違えると、ふつうのディズニー攻略アプリになってしまう。
 *
 * 出した点数そのものは画面に出さない。出すのは reasons の方で、
 * 当日それを読み上げて家族を動かせることが、このエンジンの合否になる。
 */

/** 幼児の昼寝は毎日13:30から約2時間 */
const NAP_MIN = 120
/** 覚醒時間。7時起き→13:30昼寝から逆算 */
const WAKE_WINDOW_MIN = 390
/** 退園時刻に対する安全マージン。帰り道は別途エリア距離から計算する */
const LEAVE_MARGIN_MIN = 5
/** 着席とみなす下限。これ未満は休息に数えない */
const SEATED_THRESHOLD = 10

function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 60000
}

/** 'HH:mm' をその日の分数に直す */
function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function inWindow(now: Date, w: { from: string; to: string }): boolean {
  const cur = now.getHours() * 60 + now.getMinutes()
  return cur >= hhmmToMin(w.from) && cur <= hhmmToMin(w.to)
}

/** 待ち時間以外にその場で使う分数 */
export function dwellMinutes(f: Facility): number {
  if (f.seatedMin > 0) return f.seatedMin
  switch (f.kind) {
    case 'greeting':
      return 10
    case 'play':
      return 15
    case 'shop':
      return 20
    default:
      return 10
  }
}

export function waitOf(
  f: Facility,
  ctx: Context,
): { min: number; open: boolean; known: boolean } {
  const w = ctx.waits[f.id]
  if (w) return { min: w.min, open: w.open, known: true }
  return { min: f.defaultWait ?? 15, open: true, known: false }
}

/**
 * 1施設ぶんの評価。候補から外すべきものは null を返す。
 * 除外は「物理的に無理」なものだけに絞り、好みの問題は減点で表す。
 */
function evaluate(f: Facility, ctx: Context): Suggestion | null {
  const { min: waitMin, open } = waitOf(f, ctx)

  // ── 除外条件 ──
  if (!open) return null
  if (ctx.done.includes(f.id) && !f.repeatable) return null
  // 時刻が決まっているもの（パレード・食事の時間帯）は窓の外なら候補にしない
  if (f.window && !inWindow(ctx.now, f.window)) return null
  // 5人で動くので、柊が入れないものは家族の選択肢にならない
  if (!f.kidOk) return null
  // ベビーカーから降ろせない＝ライドとグリーティングは寝ている間まるごと落ちる
  if (ctx.hiiragi === 'asleep' && (f.kind === 'ride' || f.kind === 'greeting')) return null

  const walkM = AREA_DISTANCE[ctx.area][f.area]
  const walkMin = walkMinutes(ctx.area, f.area)
  const totalMin = walkMin + waitMin + dwellMinutes(f)
  const minsLeft = minutesBetween(ctx.now, ctx.leaveAt) - LEAVE_MARGIN_MIN
  // 一律の余裕を引くのではなく、そこから入口まで戻る時間を実際に足す。
  // 固定値にすると、入口に近い施設まで巻き添えで落ちる。
  const returnMin = walkMinutes(f.area, 'bazaar')
  if (totalMin + returnMin > minsLeft) return null

  // ── 加点・減点 ──
  // 体験そのものの基礎点。これが無いと、何の加点も減点も付かない土産屋が
  // わずかに減点された本命のアトラクションを追い抜いてしまう。
  let score = f.kind === 'shop' ? 0 : 10
  const reasons: string[] = []

  const sinceSeated = ctx.lastSeatedAt ? minutesBetween(ctx.lastSeatedAt, ctx.now) : 999

  if (f.seatedMin >= SEATED_THRESHOLD) {
    if (sinceSeated >= 90) {
      score += 40 + Math.min(sinceSeated - 90, 60) * 0.5
      reasons.push(`前に座ってから${Math.round(sinceSeated)}分たっています`)
    } else if (sinceSeated >= 60) {
      score += 15
    }
    reasons.push(`${f.seatedMin}分ぶん座れます`)
  }
  // 着席の価値は長さに比例しない。90分ルールを満たすかどうかが本体なので、
  // 上限を付けないと70分の食事が常に1位になって他が全部潰れる。
  score += Math.min(f.seatedMin, 20) * 1.2

  score -= waitMin * 1.5
  if (waitMin <= 10) reasons.push(`待ち${waitMin}分`)

  score -= walkM * 0.05
  if (walkM === 0) reasons.push('いまいるエリアです')
  else if (walkM <= 200) reasons.push(`ここから${walkM}m`)

  // 入口から遠ざかる方向。夕方ほど強く嫌う
  const outward = EXIT_RANK[f.area] - EXIT_RANK[ctx.area]
  const lateFactor = minsLeft < 60 ? 25 : minsLeft < 120 ? 12 : 4
  if (outward > 0) {
    score -= outward * lateFactor
  } else if (outward < 0 && minsLeft < 120) {
    score += Math.min(-outward, 2) * 6
    reasons.push('入口方向なので戻りやすい')
  }

  // ── 柊モード ──
  switch (ctx.hiiragi) {
    case 'genki':
      if (f.kind === 'greeting' || f.kind === 'play') {
        score += 25
        reasons.push('柊が起きている今がチャンス')
      }
      // 2歳が列に耐えられるのは25分くらいまで
      if (waitMin > 25) score -= (waitMin - 25) * 2
      break

    case 'sleepy':
      if (f.loud || f.dark) score -= 30
      if (f.lullaby) {
        score += 30
        reasons.push('乗っているうちに寝落ちしやすい')
      }
      if (f.kind === 'greeting') score -= 20
      break

    case 'asleep':
      if (f.kind === 'shop' || f.kind === 'food') {
        score += 30
        reasons.push('寝ている今のうちに済ませられます')
      }
      if (f.kind === 'parade' && f.strollerOk) {
        score += 20
        reasons.push('ベビーカーのまま観られます')
      }
      // 昼寝は「ロス」ではなく「歩く時間」
      if (walkM >= 250) {
        score += 20
        reasons.push('歩く区間は寝ている間に消化するのが得です')
      }
      if (f.loud) score -= 15
      break

    case 'justWoke':
      if (f.kind === 'food') {
        score += 20
        reasons.push('起きた直後はまず食べさせる')
      }
      if (waitMin > 10) score -= (waitMin - 10) * 2
      if (f.seatedMin >= SEATED_THRESHOLD) score += 10
      break
  }

  // マストは効率で却下されない。
  // さらに、締切が迫るほど重みを上げる。
  // 「行きたいもの」を加点ではなく締切問題として扱う、という設計の要。
  if (ctx.must.includes(f.id)) {
    const slack = minsLeft - (totalMin + returnMin)
    if (slack < 30) {
      score += 120
      reasons.push(`いま向かわないと間に合いません（残り${Math.round(slack)}分）`)
    } else if (slack < 90) {
      score += 70
      reasons.push('行けるチャンスが残りわずかです')
    } else {
      score += 50
      reasons.push('必ず行くと決めたものです')
    }
  }

  return { facility: f, score, reasons, walkM, waitMin, totalMin }
}

export function suggest(ctx: Context): Suggestion[] {
  return OPEN_FACILITIES.map((f) => evaluate(f, ctx))
    .filter((s): s is Suggestion => s !== null)
    .sort((a, b) => b.score - a.score)
}

/**
 * マスト指定した施設の締切逆算。
 * 「行くかどうか」ではなく「いつ行くか」の問題に変換するための警告。
 */
export function mustWarnings(ctx: Context): MustWarning[] {
  const out: MustWarning[] = []
  for (const id of ctx.must) {
    const f = BY_ID[id]
    if (!f || ctx.done.includes(id)) continue

    const { min: waitMin, open } = waitOf(f, ctx)
    const need =
      walkMinutes(ctx.area, f.area) + waitMin + dwellMinutes(f) + walkMinutes(f.area, 'bazaar')
    const minsLeft = minutesBetween(ctx.now, ctx.leaveAt) - LEAVE_MARGIN_MIN
    const slackMin = Math.round(minsLeft - need)

    let level: MustWarning['level']
    let message: string
    if (!open) {
      level = 'gone'
      message = `${f.name}はいま止まっています`
    } else if (slackMin < 0) {
      level = 'gone'
      message = `${f.name}は今日はもう間に合いません`
    } else if (slackMin < 30) {
      level = 'last'
      message = `${f.name}、いま向かわないと間に合いません（残り${slackMin}分）`
    } else if (slackMin < 90) {
      level = 'soon'
      message = `${f.name}に行けるのはあと${Math.floor(slackMin / 30)}回分くらいです`
    } else {
      level = 'ok'
      message = `${f.name}はまだ余裕があります`
    }
    out.push({ facility: f, slackMin, level, message })
  }
  return out.sort((a, b) => a.slackMin - b.slackMin)
}

/** 寝ている柊があと何分で起きるか */
export function wakeForecast(
  ctx: Context,
): { sleptMin: number; minRemain: number; maxRemain: number } | null {
  if (ctx.hiiragi !== 'asleep' || !ctx.sleptAt) return null
  const sleptMin = Math.round(minutesBetween(ctx.sleptAt, ctx.now))
  return {
    sleptMin,
    minRemain: Math.max(0, Math.round(NAP_MIN - 30 - sleptMin)),
    maxRemain: Math.max(0, Math.round(NAP_MIN + 15 - sleptMin)),
  }
}

/**
 * 「柊、眠そう？」とこちらから聞くべきタイミングか。
 * 押し忘れを構造的に防ぐため、入力させるのではなくアプリから聞く。
 */
export function shouldAskSleepy(ctx: Context): boolean {
  if (ctx.hiiragi !== 'genki' || !ctx.morningWokeAt) return false
  const awakeMin = minutesBetween(ctx.morningWokeAt, ctx.now)
  return awakeMin >= WAKE_WINDOW_MIN - 60
}

/**
 * いま寝かせた場合と、もう少しもたせた場合で、起床時刻がどう動くか。
 * 「いつ寝かせるか」は選べる、という前提の機能。
 */
export function napPlan(ctx: Context, delayMin: number) {
  const wakeIfNow = new Date(ctx.now.getTime() + NAP_MIN * 60000)
  const wakeIfLater = new Date(ctx.now.getTime() + (delayMin + NAP_MIN) * 60000)
  return { wakeIfNow, wakeIfLater }
}
