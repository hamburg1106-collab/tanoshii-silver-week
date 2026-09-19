/**
 * 9/22に立てた元の予定。共有ページのタイムラインと同じ中身。
 *
 * アプリはこれを守らせるためではなく、**ここからどれだけズレたか**を測るために持つ。
 * 計画どおりなら見る必要はない。
 */
export type PlanItem = {
  /** 'HH:mm' */
  time: string
  label: string
  /** 対応する施設。入園・出発など施設でないものは持たない */
  facilityId?: string
}

export const PLAN: PlanItem[] = [
  { time: '09:50', label: '入園' },
  { time: '10:15', label: 'イッツ・ア・スモールワールド', facilityId: 'smallworld' },
  { time: '11:05', label: 'ミッキーの家とミート・ミッキー', facilityId: 'meet-mickey' },
  { time: '12:10', label: 'クリスタルパレスで昼食', facilityId: 'crystalpalace' },
  { time: '13:30', label: 'ミッキーのフィルハーマジック', facilityId: 'philharmagic' },
  { time: '14:00', label: 'プーさんのハニーハント', facilityId: 'pooh' },
  { time: '14:30', label: 'ハロウィーンパレード', facilityId: 'parade' },
  { time: '15:40', label: 'カントリーベア・シアター', facilityId: 'countrybear' },
  { time: '16:10', label: 'ジャングルクルーズ', facilityId: 'jungle' },
  { time: '16:55', label: 'ワールドバザールで土産', facilityId: 'bazaar-shop' },
  { time: '17:30', label: '出発' },
]

/** 予定していた昼寝の時間帯。毎日13:30から約2時間、当日は起床が早いぶん前倒し */
export const PLANNED_NAP = { from: '13:00', to: '15:00' } as const
