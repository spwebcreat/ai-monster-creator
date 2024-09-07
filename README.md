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
- API Requests: Axios
- AI画像生成: GetImg.ai API (FLUX.1 [schnell] Text to Image)
- アイコン: @heroicons/react, @coreui/icons
- ローディング表示: react-loading

## AI技術詳細
本プロジェクトでは、getimg.ai の FLUX.1 [schnell] Text to Image API を使用しています。このAPIは、高速で効率的な画像生成を可能にし、ユーザーの入力に基づいてカスタマイズされたモンスター画像を生成します。

主な特徴：
- 高速な画像生成
- カスタマイズ可能なプロンプト入力
- 人型と動物型のモンスター生成に対応

API統合の実装は `getImgApi.ts` ファイルで確認できます。

## プロジェクトの構造
- `app/page.tsx`: メインページコンポーネント
- `app/components/MonsterForm.tsx`: モンスター生成フォームと結果表示コンポーネント
- `app/lib/getImgApi.ts`: GetImg.ai APIとの通信を行うユーティリティ関数
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
`.env.local`ファイルを作成し、GetImg.ai APIキーを設定:
```
NEXT_PUBLIC_GETIMG_API_KEY=your_api_key_here
```
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

## 今後の展望
- ユーザー認証機能の実装
- 生成されたモンスターの保存と管理機能
- モンスター対戦シミュレーション機能の追加
- より多様な属性とタイプの追加
- モバイル対応の強化

## 注意事項
このサイトはポートフォリオ目的で作成しております。1日あたりの生成回数を制限することがあります。

## ライセンス
このプロジェクトは [ライセンス名] のもとで公開されています。詳細は[LICENSE](LICENSE)ファイルをご覧ください。




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

