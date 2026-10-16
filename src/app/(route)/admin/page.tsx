import type { Metadata } from 'next'
import AdminLogin from './AdminLogin'

// 管理モードの入口。リンクはどこにも置かず、検索にも出さない
export const metadata: Metadata = {
  title: '管理モード | AI MONSTER CREATOR',
  robots: { index: false, follow: false },
};

const AdminPage = () => (
  <div className="globalConatiner">
    <AdminLogin />
  </div>
)

export default AdminPage
