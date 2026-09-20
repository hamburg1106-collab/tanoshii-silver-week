/**
 * 9/22に立てた元の予定。共有ページのタイムラインと同じ中身。
 *
 * アプリはこれを守らせるためではなく、**ここからどれだけズレたか**を測るために持つ。
 * 計画どおりなら見る必要はない。
 *
 * 2026-09-20 に行きたいリストの更新を受けて全面的に組み直した。
 * 元のリスト12件＋食べ歩き6件は、待ち時間を祝日水準で置くと763分になり、
 * 滞在時間460分に対して約5時間あふれる。入るぶんだけに絞ってある。
 *
 * 抽選（ジャンボリミッキー・マジカルミュージックワールド）はここに入れていない。
 * **当たる前提で組むと、外れた時に予定がまるごと崩れるから**。
 * 当たったら、その時間に重なるものを「捨てる」で落として差し替える。
 */
export type PlanItem = {
  /** 'HH:mm' */
  time: string
  label: string
  /** 対応する施設。入園・出発など施設でないものは持たない */
  facilityId?: string
}

/**
 * 入園予定の時刻。
 * DPAは入園のQRを読ませたあとでないと買えず、
 * エントリー受付（抽選）も入園後でないと引けないので、手配の案内はここを起点にする。
 */
export const ENTRY_TIME = '09:50'

export const PLAN: PlanItem[] = [
  { time: ENTRY_TIME, label: '入園（すぐ抽選2件とプーさんDPA）' },
  // 朝いちばんが一日でいちばん空く。マストのジャングルクルーズをここに置く
  { time: '10:00', label: 'ジャングルクルーズ', facilityId: 'jungle' },
  { time: '10:45', label: 'ポップコーン しょうゆバター', facilityId: 'pop-shoyu' },
  { time: '11:13', label: 'イッツ・ア・スモールワールド', facilityId: 'smallworld' },
  // DPAは12時前後の枠を選ぶ。昼寝に入ると乗れなくなるので、午前中に使い切る
  { time: '12:00', label: 'プーさんのハニーハント（DPA）', facilityId: 'pooh' },
  { time: '12:10', label: 'クイーン・オブ・ハートで昼食', facilityId: 'queenofhearts' },
  // パレードは13:00〜13:45でルートを一周する。店を出てファンタジーランド側で拾う
  { time: '13:15', label: 'お昼のパレードをチラ見', facilityId: 'harmony' },
  // ここから約2時間、柊は昼寝。ベビーカーで動ける用事だけを並べてある
  { time: '13:48', label: 'ミッキーワッフルとお土産', facilityId: 'bazaar-shop' },
  { time: '14:47', label: 'チキンとトマトのカルツォーネ', facilityId: 'calzone' },
  { time: '15:11', label: 'グローブシェイプ・チキンパオ', facilityId: 'pao' },
  // 起床後の主役。トゥーンタウンにいるうちに済ませる
  { time: '15:30', label: 'ミッキーの家とミート・ミッキー', facilityId: 'meet-mickey' },
  { time: '17:30', label: '出発' },
]

/**
 * 今回は入らなかったもの。消すのではなく理由つきで残す。
 * 当日ズレが出たとき、何を足せるか／何を諦めたかをこの場で見返せるようにする。
 */
export const LEFT_OUT: { facilityId: string; why: string }[] = [
  { facilityId: 'jamboree', why: '抽選しだい。当たったら重なるものを捨てて入れる' },
  { facilityId: 'mmw', why: '抽選しだい。25分の着席ショーなので高齢者2名の休息にはなる' },
  { facilityId: 'pirates', why: '53分かかる。膝の上では乗れず、暗くて音も大きい' },
  { facilityId: 'carrousel', why: 'ファンタジーランドの午前が埋まった' },
  { facilityId: 'philharmagic', why: '16分の暗い3Dシアター。大音量で幼児には重い' },
  { facilityId: 'westernriver', why: '終盤の暗闇と恐竜。43分かかるわりに不安が大きい' },
  { facilityId: 'villains', why: '16:35開始・約45分。17:30出発だと最後まで観られない' },
  { facilityId: 'pop-pepper', why: 'カウボーイ・クックハウス前。ウエスタンランドに行く予定が無い' },
  { facilityId: 'porkroll', why: 'ペコスビル・カフェ。同じくウエスタンランド' },
]

/** 予定していた昼寝の時間帯。毎日13:30から約2時間、当日は起床が早いぶん前倒し */
export const PLANNED_NAP = { from: '13:15', to: '15:15' } as const
