# AI Monster Generator

## プロジェクト概要
AI Monster Generatorは、ユーザーが入力した特徴と属性を基にAIを使用してユニークなモンスター画像を生成するNext.js + TypeScriptアプリケーションです。このプロジェクトは、最新のWeb技術とAI画像生成APIを組み合わせた革新的なポートフォリオ作品で、実際に[デプロイされて](https://ai-monster-generator.vercel.app/)利用可能です。

## デモ
実際のアプリケーションは[こちら](https://ai-monster-generator.vercel.app/)でご覧いただけます。

## 主な機能
- ユーザーがモンスターの特徴と属性を入力
- AIを使用してユニークなモンスター画像を生成
- 生成されたモンスター画像をSNS（X/Twitter）で共有

## 技術スタック
- Frontend: Next.js 14, React18, TypeScript
- Styling: Tailwind CSS
- API Requests: Axios
- AI画像生成: GetImg.ai API (FLUX.1 [schnell] Text to Image)
- Hosting: Vercel

## AI技術詳細
本プロジェクトでは、getimg.ai の FLUX.1 [schnell] Text to Image API を使用しています。このAPIは、高速で効率的な画像生成を可能にし、ユーザーの入力に基づいてカスタマイズされたモンスター画像を生成します。

主な特徴：
- 高速な画像生成（約1秒）
- 高品質な出力（512x512ピクセル）
- カスタマイズ可能なプロンプト入力

API統合の実装は `getImgApi.ts` ファイルで確認できます。

## プロジェクトの構造
- `page.tsx`: メインページコンポーネント
- `MonsterForm.tsx`: モンスター生成フォームコンポーネント
- `getImgApi.ts`: GetImg.ai APIとの通信を行うユーティリティ関数
- `attributes.ts`: モンスター属性のデータ

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

## デプロイ
このプロジェクトはVercelにデプロイされています。Vercelの継続的デプロイメント機能により、mainブランチへのプッシュが自動的に本番環境に反映されます。

デプロイURL: https://ai-monster-generator.vercel.app/

## 使い方
1. フォームにモンスターの特徴（例：cute）を入力
2. ドロップダウンメニューからモンスターの属性を選択
3. "モンスターを生成する"ボタンをクリック
4. 生成されたモンスター画像を確認
5. 必要に応じて、"Xに投稿する"ボタンを使用してSNSで共有

## 今後の展望
- 生成時・生成後のアニメーションの追加
- より多様なモンスター属性の追加
- ページデザインのブラッシュアップ
- シチュエーションの追加
- ユーザー認証機能の実装
- 生成されたモンスターの保存と管理機能
- モンスター対戦シミュレーション機能の追加