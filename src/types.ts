/** 参加者ID。同行する幼児はログイン対象外 */
export type PersonId = 'toshi' | 'tsuma' | 'chichi' | 'haha' | 'hiiragi'

export type Person = {
  id: PersonId
  name: string
  canLogin: boolean
  /** 人を見分けるための色相（0〜360）。明るさはテーマ側で決める */
  hue: number
}

/** パークのエリア。プラザは移動の結節点なので独立させる */
export type AreaId =
  | 'bazaar'
  | 'plaza'
  | 'adventure'
  | 'western'
  | 'critter'
  | 'fantasy'
  | 'toon'
  | 'tomorrow'

/**
 * 施設の種別。
 * 「寝ている柊をベビーカーから降ろせない」ので、
 * ride と greeting は睡眠中まるごと落ちる。ここが種別を分ける最大の理由。
 */
export type Kind = 'ride' | 'show' | 'greeting' | 'play' | 'food' | 'shop' | 'parade'

export type Facility = {
  id: string
  name: string
  area: AreaId
  kind: Kind
  /**
   * queue-times.com の ride id。
   * 無い施設（ミッキーの家、レストラン、パレード）は手入力に頼る。
   */
  qtId?: number
  /** 乗車・鑑賞している間の着席分数。立ち見や歩行型は0 */
  seatedMin: number
  /** 幼児が同行できるか（身長制限なし・内容が年齢に合う） */
  kidOk: boolean
  /** 屋内か。暑さと雨の判断に使う */
  indoor: boolean
  /** 大音量。寝ている子を起こす */
  loud?: boolean
  /** 暗所がある。眠い・怖がる場面で効く */
  dark?: boolean
  /** ベビーカーに乗せたまま楽しめる（パレード等） */
  strollerOk?: boolean
  /** 乗っているうちに寝落ちしやすい。眠いときの寝かしつけ候補 */
  lullaby?: boolean
  /** 待ち時間の既定値。データが無い施設の手入力の初期値に使う */
  defaultWait?: number
  /**
   * やれる時間が決まっているもの。'HH:mm'。
   * パレードのような時刻固定イベントと、食事の時間帯に使う。
   */
  window?: { from: string; to: string }
  /** 何度でも寄れるか。ベビーセンターやトイレ系だけ true */
  repeatable?: boolean
  /** 行くために事前の手配が要るもの。無ければ並ぶだけ */
  access?: Access
  /** 当日休止。候補にも予定にも出さないが、理由を残すため消さずに持つ */
  closed?: boolean
  note?: string
}

/**
 * 「行くために何をすればいいか」。
 *
 * DPAは購入から60分、または利用開始時刻の早い方で次が買える。
 * **アトラクション枠とショー枠は別カウントなので同時に持てる**（公式FAQ）。
 * この lane はその区別のために要る。
 *
 * entry（エントリー受付）は性質がまるで違う。無料の抽選で、
 * **1施設につき1日1回しか引けず、外れたらその日はもう手が無い**。
 * 締切は公演開始の25分前。だから「いつ引くか」ではなく「引き忘れないか」が全て。
 */
export type Access = {
  kind: 'dpa' | 'ps' | 'entry'
  /** DPAの枠。アトラクションとショーで別々に60分のしばりがかかる */
  lane?: 'attraction' | 'show'
  /** 1人あたりの円 */
  yen?: number
  /** 売り切れやすさ。動く順番を決める */
  risk: 'high' | 'mid' | 'low'
  /** 画面に出す一言 */
  hint: string
  /** 価格や対象が裏取りできていないもの。画面で断定しない */
  unverified?: boolean
}

/** 柊の状態。減点ではなくモードとして扱う */
export type HiiragiMode = 'genki' | 'sleepy' | 'asleep' | 'justWoke'

/** 待ち時間1件。source で自動取得か手入力かを見分ける */
export type Wait = {
  min: number
  open: boolean
  /** 取得時刻(ISO)。古くなったら画面で警告する */
  at: string
  source: 'auto' | 'manual'
}

/** 提案を出すために必要な現在の状況 */
export type Context = {
  now: Date
  /**
   * 実際に入園した時刻。まだなら null。
   *
   * 予定時刻で代用しない。DPAも抽選も「入園のQRを読ませたあと」でないと
   * 動かせないので、時計が9:00を回っただけで「買えます」と出すと嘘になる。
   * ゲートで待たされた日ほど、その嘘が当日いちばん効く場面で出る。
   */
  enteredAt: Date | null
  /** いまいるエリア。「乗った」を押すと確定する */
  area: AreaId
  /** 最後に座った時刻。90分ルールの起点 */
  lastSeatedAt: Date | null
  hiiragi: HiiragiMode
  /** 柊が寝入った時刻。起床予測に使う */
  sleptAt: Date | null
  /** 柊が今朝起きた時刻。覚醒時間から眠気の窓を予測する */
  morningWokeAt: Date | null
  /** パークを出る時刻 */
  leaveAt: Date
  waits: Record<string, Wait>
  /** 済んだ施設のid */
  done: string[]
  /** 必ず行くと決めた施設のid。効率で却下されない */
  must: string[]
}

export type Suggestion = {
  facility: Facility
  score: number
  /** 画面に出す根拠。ここが空になる提案は出さない */
  reasons: string[]
  walkM: number
  waitMin: number
  /** 現地に着いて、体験を終えるまでの合計分数 */
  totalMin: number
}

/** マスト指定した施設の締切警告 */
export type MustWarning = {
  facility: Facility
  /** 残り何分でチャンスが消えるか */
  slackMin: number
  level: 'ok' | 'soon' | 'last' | 'gone'
  message: string
}
