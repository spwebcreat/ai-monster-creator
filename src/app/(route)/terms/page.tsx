import Link from 'next/link'
import React from 'react'

const Terms = () => {
  return (
    <>
      <div className="globalConatiner">
        <div className="globalTitle">
          <h2 className="globalTitleText">利用規約</h2>
        </div>


        <div className="globalField">
          <h3 className="globalFieldTitle">1. はじめに</h3>
          <p>
            AI Monster Generator（以下「本サービス」）をご利用いただき、ありがとうございます。
            本利用規約は、本サービスの利用に関する条件を定めるものです。
          </p>
        </div>

        <div className="globalField">
          <h3 className="globalFieldTitle">2. サービスの利用</h3>
          <p>
            本サービスは、ユーザーが入力した情報に基づいてAIがモンスター画像を生成します。<br />
            ユーザーは、本サービスを個人的、非商業的な目的でのみ使用することができます。<br />
            生成された画像の著作権は、適用法令に基づいて決定されます。
          </p>
        </div>

        <div className="globalField">
          <h3 className="globalFieldTitle">3. 禁止事項</h3>
          <p>
            違法、有害、脅迫的、虐待的、嫌がらせ、誹謗中傷的、俗悪、猥褻、名誉毀損、他者のプライバシーを侵害する、憎悪を煽る、または人種的、民族的に不適切な内容の画像を生成すること <br />
            本サービスのシステムやネットワークの不正アクセスや妨害を試みること <br />
            本サービスを商業目的で利用すること
          </p>
        </div>


        <div className="globalField">
          <h3 className="globalFieldTitle">4. 免責事項</h3>
          <p>
          本サービスは「現状有姿」で提供され、明示または黙示を問わず、いかなる種類の保証も行いません。 
          運営者は、本サービスの利用により生じたいかなる損害についても責任を負いません。
          </p>
        </div>


        <div className="globalField">
          <h3 className="globalFieldTitle">5. 知的財産権</h3>
          <p>本サービスのコンテンツ、デザイン、ロゴ等の知的財産権は、運営者またはそのライセンサーに帰属します。
            ユーザーが生成した画像の利用に関しては、適用法令に従ってください。</p>
        </div>

        <div className="globalField">
          <h3 className="globalFieldTitle">6. プライバシー</h3>
          <p>当サイトが取得した個人情報について、法令に定める場合又は本人の同意を得た場合を除き、以下に定める利用目的の達成に必要な範囲を超えて利用することはありません。 当社は、法令で定める場合を除き、本人の同意に基づき取得した個人情報を、本人の事前の同意なく第三者に提供することはありません。</p>

        </div>

        <div className="globalField">
          <h3 className="globalFieldTitle">7. 変更</h3>
          <p>運営者は、必要に応じて本規約を変更する権利を有します。変更後の利用規約は、本サービス上で公開された時点で効力を生じるものとします。</p>
        </div>

        <div className="globalField">
          <h3 className="globalFieldTitle">8. 準拠法と管轄</h3>
          <p>本規約の解釈および適用は日本法に準拠するものとし、本サービスに関連する紛争については、[管轄裁判所]を第一審の専属的合意管轄裁判所とします。</p>
          <p className="mt-28">
            以上の利用規約に同意いただける場合のみ、本サービスをご利用ください。
          </p>
        </div>






      </div>
    </>
  )
}

export default Terms