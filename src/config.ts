export const APP_NAME = '楽しいシルバーウイーク'

/** localStorageのキー。端末ごとに独立（1日目は共有同期なし） */
export const STORAGE_KEY = 'tanoshii-sw:state'

/**
 * 退園の既定時刻。設定画面から変えられる。
 * お土産を最後に回したぶん帰り道に30分要るので、17:30から30分延ばした。
 */
export const DEFAULT_LEAVE = '18:00'

/**
 * データ提供元の表示。queue-times.com の利用条件で必須。
 * 目立つ場所にリンク付きで置くこと。消さない。
 */
export const ATTRIBUTION = {
  label: 'Powered by Queue-Times.com',
  url: 'https://queue-times.com/en-US',
} as const
