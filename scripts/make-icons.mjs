// アプリアイコンを生成する。`node scripts/make-icons.mjs` で public/ に書き出す。
//
// モチーフは星。キャラクターのシルエットやロゴは使わない。
// 丸を3つ組み合わせる図形も、特定のキャラクターを想起させるので避けている。
// 文字を入れないのは、環境によってフォントが無くレンダリングが崩れるため。
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const GRAPE = '#8e5fd8'
const PEACH = '#ff8fb1'
const FG = '#ffffff'

/** 5角の星。外周と内周の頂点を交互に結ぶ */
const starPath = (cx, cy, outer, inner) => {
  const pts = []
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner
    // -90度から始めて頂点を真上に持ってくる
    const a = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join(' L')}Z`
}

const svg = (size) => {
  const cx = size / 2
  const cy = size / 2
  const star = starPath(cx, cy, size * 0.3, size * 0.135)
  // 角を丸めるため、塗りと同じ色の太いストロークを重ねる
  const soften = size * 0.055
  const dot = (x, y, r) =>
    `<circle cx="${(size * x).toFixed(2)}" cy="${(size * y).toFixed(2)}" r="${(size * r).toFixed(2)}" fill="${FG}" opacity="0.85"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GRAPE}"/>
      <stop offset="1" stop-color="${PEACH}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#g)"/>
  <path d="${star}" fill="${FG}" stroke="${FG}" stroke-width="${soften}" stroke-linejoin="round"/>
  ${dot(0.2, 0.22, 0.026)}
  ${dot(0.82, 0.3, 0.019)}
  ${dot(0.74, 0.79, 0.024)}
</svg>`
}

await mkdir(publicDir, { recursive: true })

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg(size))).png().toFile(resolve(publicDir, `icon-${size}.png`))
}
// iOSのホーム画面追加用（角丸はOS側で付くので同じ絵でよい）
await sharp(Buffer.from(svg(180))).png().toFile(resolve(publicDir, 'apple-touch-icon.png'))
await writeFile(resolve(publicDir, 'favicon.svg'), svg(64), 'utf8')

console.log('アイコンを public/ に書き出しました')
