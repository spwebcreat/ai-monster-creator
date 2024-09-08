import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

function About() {
  return (
    <>
      <div className="globalConatiner">

        <div className="globalTitle">
          <h2 className="globalTitleText">このサイトについて</h2>

        </div>

        <div className="globalField">
          <h3 className="globalFieldTitle">概要</h3>
          <p>
            <b>AI Monster Generator</b> は、AIを活用して独自のモンスターキャラクターを生成するWEBアプリケーションです。
            ユーザーが入力した特徴と属性に基づいて、AIが独創的なモンスター画像を作成します。
            AI が生成する画像の利用等については 利用規約  をお読みください。
          </p>
          <p>このような有益なAPIを作成いただき、GetImg.ai APIの提供者様に心より感謝申し上げます。</p>
        </div>


        <div className="globalField">
          <h3 className="globalFieldTitle">目的</h3>
          <p>このプロジェクトについての主な目的は以下の通りです</p>
          <ul>
            <li>ポートフォリオとしての制作</li>
            <li>AIを使ったアプリを作成してみたかったため</li>
            <li>Next.js + typescript の学習</li>
            <li>AIを使ったモダンな開発体験を得るため</li>
          </ul>
        </div>

        <div className="globalField">
          <h3 className="globalFieldTitle">使用技術</h3>
          <ul>
            <li>フロントエンド: Next.js 14  /  typescript</li>
            <li>AI画像生成: GetImg.ai API (https://getimg.ai/tools/api)</li>
            <li>スタイリング: CSS Modules, Tailwind CSS</li>
            <li>バックエンド: vercel / vercel KV / vercel Storage</li>
          </ul>
        </div>

        <div className="globalField">
          <h3 className="globalFieldTitle">今後の展望</h3>
          <ul>
            <li>生成時・生成後のアニメーションの追加</li>
            <li>属性の整理・見直し</li>
            <li>シチュエーション選択の追加</li>
            <li>ユーザー認証機能の実装</li>
            <li>生成されたモンスターの保存と管理機能</li>
            <li>モンスター対戦シミュレーション機能の追加</li>
          </ul>
        </div>

        <div className="globalField">
          <h3 className="globalFieldTitle">開発者について</h3>
          
          <div className="profiles">

            <div className="profileHeader">
              <Image src="/img/profile.png" alt="プロフィール画像" width={190} height={190} />
              <div className="info">
                <div className="name">
                  清水 春雄
                  <span>HARUO SHIMIZU</span>
                </div>
              </div>
            </div>
            
            <div className="profileBody">
              <table>
                <tbody>
                  <tr>
                    <td>名称</td>
                    <td>SP WEB CREAT. （エスピーウェブクリエイト）</td>
                  </tr>
                  <tr>
                    <td>所在地</td>
                    <td>大阪府</td>
                  </tr>
                  <tr>
                    <td>事業内容</td>
                    <td>Webサイト・Webアプリ制作全般</td>
                  </tr>
                  <tr>
                    <td>WEBサイト</td>
                    <td><a href="https://www.sp-webcreat.pro/" target="_blank">https://www.sp-webcreat.pro/</a></td>
                  </tr>
                  <tr>
                    <td>Email</td>
                    <td>info@sp-webcreat.pro</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="profileFooter">
              <p>
                約10年間のWEB制作会社での勤務を経て2022年10月より
                フリーランスのWEBエンジニア / Web・UI・UXデザイナー
                として活動しております。
              </p>
              <p>
                デザイン・コーディング・WordPress・モダンJavaScript、
                またSEO対策やアクセス解析などのWEBマーケティング 
                についても経験してきた事から幅広いスキルを駆使して
                クライアント様のニーズに応じ柔軟な仕事をさせて頂いております。
              </p>
            </div>
          </div>

        </div>




      </div>
    </>
  )
}

export default About