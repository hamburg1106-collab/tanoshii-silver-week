// queue-times.com から東京ディズニーランドの待ち時間を取り、JSONを標準出力に書く。
// GitHub Actions から5分おきに呼ばれる。
//
// ブラウザから直接この API を叩くことはできない（CORSヘッダが返らない）。
// だからサーバ側にあたるActionsで取得し、rawで配信できる場所に置いている。
//
// 東京ディズニーリゾートの公式サイトは絶対に直接叩かないこと。規約で禁止されている。

/** queue-times における東京ディズニーランドの park id */
const PARK_ID = 274
const ENDPOINT = `https://queue-times.com/parks/${PARK_ID}/queue_times.json`

const res = await fetch(ENDPOINT, {
  headers: { 'user-agent': 'tanoshii-silver-week (personal family app)' },
})

if (!res.ok) {
  console.error(`取得に失敗しました: HTTP ${res.status}`)
  process.exit(1)
}

const data = await res.json()

// lands の下にぶら下がる園と、rides 直下に並ぶ園がある。両方から拾う
const rides = [...(data.rides ?? []), ...(data.lands ?? []).flatMap((l) => l.rides ?? [])]

if (rides.length === 0) {
  console.error('待ち時間が1件も取れませんでした。形式が変わった可能性があります')
  process.exit(1)
}

// 施設名との対応はアプリ側（TypeScript）で持つので、ここでは id と数字だけ通す
const out = {
  at: new Date().toISOString(),
  source: 'queue-times.com',
  rides: rides.map((r) => ({
    id: r.id,
    wait: typeof r.wait_time === 'number' ? r.wait_time : 0,
    open: Boolean(r.is_open),
  })),
}

process.stdout.write(JSON.stringify(out))
