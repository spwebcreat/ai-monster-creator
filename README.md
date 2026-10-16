# AI Monster Generator

## プロジェクト概要
AI Monster Generatorは、ユーザーが入力した特徴と属性を基にAIを使用してユニークなモンスター画像を生成するNext.js + TypeScriptアプリケーションです。このプロジェクトは、最新のWeb技術とAI画像生成APIを組み合わせた革新的なポートフォリオ作品です。

## 主な機能
- ユーザーがモンスターの特徴、属性、タイプ（人型/動物型）を入力
- AIを使用してユニークなモンスター画像を生成
- 魔法陣のアニメーションによる生成プロセスの視覚化
- 生成されたモンスター画像をSNS（X/Twitter）で共有
- 生成された画像のダウンロード機能

## 技術スタック
- Frontend: Next.js 14, React 18, TypeScript
- Styling: SCSS, Tailwind CSS
- State Management: React Hooks (useState, useEffect)
- API Requests: fetch（getimg.ai へはサーバー側の `/api/generate` から呼び出す）
- AI画像生成: GetImg.ai API (FLUX.1 [schnell] Text to Image)
- 特徴の英訳: Anthropic API（Claude Haiku 5.5・日本語などの特徴を指示文用の英語に直す）
- アイコン: @heroicons/react, @coreui/icons
- ローディング表示: react-loading

## AI技術詳細
本プロジェクトでは、getimg.ai の FLUX.1 [schnell] Text to Image API を使用しています。このAPIは、高速で効率的な画像生成を可能にし、ユーザーの入力に基づいてカスタマイズされたモンスター画像を生成します。

主な特徴：
- 高速な画像生成
- カスタマイズ可能なプロンプト入力
- 人型と動物型のモンスター生成に対応

API統合の実装は `getImgApi.ts`（サーバー専用）と `api/generate/route.ts` で確認できます。APIキーはサーバー側だけで使い、ブラウザには渡しません。

## プロジェクトの構造
- `app/page.tsx`: メインページコンポーネント
- `app/components/MonsterForm.tsx`: モンスター生成フォームと結果表示コンポーネント
- `app/api/generate/route.ts`: 入力の検証・1日の生成上限の管理を行い、画像を生成するサーバーAPI
- `app/lib/getImgApi.ts`: GetImg.ai APIとの通信と指示文（プロンプト）の組み立てを行うサーバー専用の関数
- `app/lib/translateDescription.ts`: 特徴（自由入力）を指示文用の英語に直すサーバー専用の関数（英数字だけの入力は英訳せず、どちらも 120 字までにして使う）
- `app/api/monsters/route.ts`: モンスターの保存（POST）と一覧の読み出し（GET・`?offset=&limit=`）を行うサーバーAPI
- `app/api/admin/*`: 管理モード（一覧から外す・戻す）の窓口
- `app/lib/monsterRecord.ts`: 保存するモンスターの検証（POST・一覧の読み出し・索引づくりのスクリプトで共有）
- `app/lib/monsterIndex.ts`: 一覧の索引（KV のキー名・1 回に返す件数など）の決まりごと
- `app/lib/adminAuth.ts`: 管理モードの認証（合言葉の照合・cookie の発行と検証・Origin の確認）
- `scripts/backfill-all-monsters.mjs`: 過去のモンスターから全件の索引を作る一回限りのスクリプト
- `app/components/Button.tsx`: カスタムボタンコンポーネント
- `app/components/Icons.tsx`: アイコンコンポーネント
- `styles/globals.scss`: グローバルスタイル定義

## セットアップと実行方法
1. リポジトリをクローン
```
git clone [リポジトリURL]
cd ai-monster-generator
```
2. 依存関係をインストール
```
npm install
```

3. 環境変数の設定
`.env.local`ファイルを作成し、GetImg.ai APIキーを設定（`NEXT_PUBLIC_` を付けない。付けるとブラウザ用のJSにキーが埋め込まれる）:
```
GETIMG_API_KEY=your_api_key_here
ANTHROPIC_API_KEY=your_api_key_here
```
`ANTHROPIC_API_KEY` が無い時や英訳に失敗した時も生成は続きます（日本語の特徴は使わず、英数字の部分だけを指示文に入れる）。
このほか、Vercel KV（生成回数・モンスターと一覧の索引）と Vercel Blob（画像の保存）の接続用の環境変数が必要です（Vercel の連携機能で設定されるもの）。
管理モードを使う時は、合言葉を `ADMIN_PASSWORD` に設定します（`NEXT_PUBLIC_` を付けない。未設定なら管理の窓口はすべて 404 になる）。

4. 開発サーバーの起動
```
npm run dev
```
5. ブラウザで `http://localhost:3000` にアクセス

## 使い方
1. トップページの「👾モンスターを生成する」ボタンをクリック
2. フォームにモンスターの特徴を入力
3. ドロップダウンメニューからモンスターの属性とタイプを選択
4. "モンスターを生成する"ボタンをクリック
5. 魔法陣のアニメーションと共に生成されたモンスター画像を確認
6. 「Xでシェアする」ボタンを使用してSNSで共有するか、「画像をダウンロード」ボタンで画像を保存

## 一覧の読み込み（API）
- `GET /api/monsters?offset=<整数>&limit=<整数>`: 全件の索引 `all_monsters`（score は作成日時のミリ秒）を新しい順に読む。`limit` は既定 13・上限 24、`offset` は既定 0（数でない・負の値は既定に戻す）
- 応答は `{ monsters, todayCount, nextOffset }`。`nextOffset` は続きを読む時に渡す offset（続きが無ければ `null`）。読めない・一覧に出す条件に合わないデータは飛ばすため、件数が `limit` に満たないことがある
- 一覧に出す条件（`checkListedMonster`）は保存の検証より緩い: id が UUID・画像が今の保存先の URL・作成日時が日時として読め 2024-01-01 以降・今＋1 日まで・職業／属性（日本語名）／タイプが今の一覧にある。性別と特徴は条件にせず、性別は今の選択肢に無ければ項目ごと省き、特徴は文字列でなければ空文字・200 字で切って返す
- `all_monsters` が最新 12 件の索引 `recent_monsters` より少ない間（索引を作る前）は、`recent_monsters` を読む
- サーバー側の描画は `getMonsters({ offset, limit })` で同じ形を受け取る
- `POST /api/monsters` は保存の検証（すべての項目を今の許可リストで確かめる）に合うものだけを保存し、両方の索引に入れる。作成日時は受け取った値を使わずサーバーの時刻を付ける。同じ id が既にあれば 409 を返し、上書きしない

## 管理モード（一覧から外す）
サイトの管理者が、一覧に出したくないモンスターを外すための窓口です。`monster:<id>` と画像は消さず、索引から外すだけです。

- `POST /api/admin/login`（本文 `{ password }`）: `ADMIN_PASSWORD` と一致すれば、HttpOnly・Secure・SameSite=Strict の cookie を発行する（12 時間）。違えば 401
  - 試行は照合の前に数え、合言葉が正しかった回は数え戻す。失敗は接続元ごとに 15 分の区切りで 5 回まで、全体で 1 日（UTC）50 回まで。それを超える試行は、同時に送られても合言葉が正しくても 429。数えられない時（KV の障害）は 503
  - cookie の値は「世代.期限.署名」。署名の鍵は KV の `admin_session_secret`（最初のログインで乱数を作る）で、合言葉そのものは鍵に使わない。合言葉を変えると発行済みの cookie は無効になる
- `POST /api/admin/logout`: cookie を消す。サイト自身から有効な cookie で呼ばれた時は、KV の `admin_session_gen`（ログインの世代）を進め、それまでに発行した cookie をすべて無効にする
- `GET /api/admin/session`: `{ admin: boolean }`（確かめられない時は `false`）
- `POST /api/admin/hide`・`POST /api/admin/unhide`（本文 `{ id }`）: cookie が有効で、Origin がサイト自身の時だけ受け付ける（cookie が無い・期限切れ・ログアウト済みは 401、Origin が違うと 403、確かめられない時は 503）。外した記録は KV の `hidden_monsters` に残り、戻す時はそこから元の位置に戻す
- `trailingSlash: true` のため、`/api/admin/login/` のように末尾に `/` を付けて呼ぶと転送が 1 回減る

## 全件の索引を作る（一回限り）
`all_monsters` を導入する前のモンスターを索引に入れるスクリプトです（Node 24 以降）。`.env.local` の `KV_REST_API_URL`・`KV_REST_API_TOKEN` の KV に接続します（値は表示しない）。
```
# 試し実行（既定・書き込まない）: 件数・年月ごとの内訳・外す理由の例を出す
node --env-file=.env.local scripts/backfill-all-monsters.mjs

# 書き込む
node --env-file=.env.local scripts/backfill-all-monsters.mjs --apply
```
- `monster:*` をすべて読み、一覧に出す条件（GET と同じ）に合い、一覧から外しておらず、画像に HEAD を送って 200 が返るものだけを入れる
- 書き込むのは `all_monsters` への ZADD だけ（ほかのキーは変えない）。何度流しても同じ結果になる
- `--apply` の最中は管理モードで一覧から外す操作をしない（読み込んだ後に外したものが、索引に入り直すことがある）

## 試験
偽の KV（Upstash の受け答えを真似るメモリ上のサーバー）に向けて、一覧・管理の窓口・索引づくりのスクリプトを試します。本番の KV や画像の保存先には通信しません（Node 24 以降）。
```
node --test "scripts/test/*.test.mjs"
```

## 今後の展望
- ユーザー認証機能の実装
- 生成されたモンスターの保存と管理機能
- モンスター対戦シミュレーション機能の追加
- より多様な属性とタイプの追加
- モバイル対応の強化

## 注意事項
このサイトはポートフォリオ目的で作成しております。1日あたりの生成回数を制限することがあります。


## プロンプト作例

人型がリアルになりすぎた例
```
prompt = `A humanoid creature inspired by ${description}, embodying the ${attribute} type. 
Blend human anatomy with fantastical elements reflecting its ${attribute} nature.
Features:
- Human-like form with subtle alterations hinting at ${attribute} powers.
- Exotic facial features emphasizing its ${attribute} nature.
- Skin texture and color reflecting the ${attribute} type.
- Accessories or body modifications enhancing ${attribute} powers.
- Clothing/armor integrating with its body and ${attribute} abilities.
- Subtle environmental effects showcasing ${attribute} powers.
- Pose suggesting confidence and control over ${attribute} abilities.
- Unique, powerful appearance blending organic and mystical elements.
Avoid resemblance to existing characters from popular media.`;
```

