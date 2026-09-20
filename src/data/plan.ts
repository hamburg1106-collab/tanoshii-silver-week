/**
 * 9/22の予定。
 *
 * アプリはこれを守らせるためではなく、**ここからどれだけズレたか**を測るために持つ。
 * 計画どおりなら見る必要はない。
 *
 * 2026-09-21 に3人（敏樹・妻・柊）へ変更。両親が来なくなったので前提が2つ変わった。
 * - 歩く速さが分速60m→80m（areas.ts）。園内の歩きが48分→31分になる
 * - 「90分ごとに座る」制約が消えた。休息のためだけの枠を置く必要がない
 * そのぶん入るものが増えたので、9:00開園に入る前提で組み直してある。
 *
 * 各行の時刻は、ひとつ前が終わる時刻＋エリア間の徒歩分から積み上げてある。
 * エリア間の合計は約2,350m・31分。列の中や店を探す歩きは別。
 *
 * 抽選（ジャンボリミッキー・マジカルミュージックワールド）は入れていない。
 * **当たる前提で組むと、外れた時に予定がまるごと崩れるから**。
 * しかも当選時刻は選べないので、昼寝と重なったら使えない。
 */
export type PlanItem = {
  /** 'HH:mm' */
  time: string
  label: string
  /** 対応する施設。入園・休憩・出発など施設でないものは持たない */
  facilityId?: string
}

/**
 * 入園予定の時刻。開園と同時。
 * ただし手配の案内が解禁されるのはこの時刻ではなく、
 * **「入園した」を押した時**（Context.enteredAt）。ここは目安にしか使わない。
 */
export const ENTRY_TIME = '09:00'

export const PLAN: PlanItem[] = [
  { time: ENTRY_TIME, label: '入園（すぐ抽選2件とプーさんDPA）' },
  // 朝がいちばん機嫌がいいので、主役をここに全部寄せる。
  // 入園処理10分＋トゥーンタウンまで9分で9:19になる
  { time: '09:19', label: 'ミッキーの家とミート・ミッキー', facilityId: 'meet-mickey' },
  { time: '10:05', label: 'イッツ・ア・スモールワールド', facilityId: 'smallworld' },
  { time: '10:40', label: 'キャッスルカルーセル', facilityId: 'carrousel' },
  // DPAは11:00〜12:00の枠を選ぶ。昼寝に入ると乗れなくなるので午前に使い切る
  { time: '11:05', label: 'プーさんのハニーハント（DPA）', facilityId: 'pooh' },
  { time: '11:20', label: 'ミッキーのフィルハーマジック', facilityId: 'philharmagic' },
  { time: '12:00', label: 'クイーン・オブ・ハートで昼食', facilityId: 'queenofhearts' },
  // パレードは13:00〜13:45でルートを一周する。ここで柊が寝る想定
  { time: '13:00', label: 'お昼のパレードをチラ見', facilityId: 'harmony' },
  // 昼寝の2時間半。乗り物は入れない。食べ歩きと休息だけ
  { time: '13:25', label: 'ポップコーン しょうゆバター', facilityId: 'pop-shoyu' },
  { time: '13:40', label: 'ポップコーン ブラックペッパー', facilityId: 'pop-pepper' },
  { time: '13:55', label: '川沿いのベンチでぼーっとする' },
  // 起床後。アドベンチャーランドで2本まとめる
  { time: '15:30', label: 'ジャングルクルーズ', facilityId: 'jungle' },
  { time: '16:30', label: 'ウエスタンリバー鉄道', facilityId: 'westernriver' },
  // 荷物になるので最後。帰り道のワールドバザールで30分とってある
  { time: '17:18', label: 'ワールドバザールでお土産', facilityId: 'bazaar-shop' },
  { time: '18:00', label: '出発' },
]

/**
 * 今回は入らなかったもの。消すのではなく理由つきで残す。
 * 当日ズレが出たとき、何を足せるか／何を諦めたかをこの場で見返せるようにする。
 */
export const LEFT_OUT: { facilityId: string; why: string }[] = [
  { facilityId: 'jamboree', why: '抽選しだい。14:40が当たると昼寝と重なって使えない' },
  { facilityId: 'mmw', why: '抽選しだい。当たったら重なるものを捨てて入れる' },
  { facilityId: 'pirates', why: '大人が交代で乗る案はやめた。柊が乗れないものは入れない' },
  { facilityId: 'pao', why: 'トゥーンタウンに行くのは朝だけ。10:00に寄り道ゼロで買える' },
  { facilityId: 'waffle', why: '食べ歩きを2件に絞った。お土産と同じ場所なので最後に足せる' },
  { facilityId: 'marktwain', why: '昼寝中は乗らないことにした。ベンチで休む' },
  { facilityId: 'villains', why: '16:35開始・約45分。18:00出発では最後まで観られない' },
]

/** 予定していた昼寝の時間帯。7:00出発で起床が6:15になるぶん、前倒しで来る */
export const PLANNED_NAP = { from: '13:00', to: '15:30' } as const
