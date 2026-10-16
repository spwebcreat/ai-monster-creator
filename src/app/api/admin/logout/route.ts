import {
  adminJson,
  clearSessionCookie,
  guardAdminRequest,
  isAdminSession,
  isSameOriginRequest,
  revokeAllSessions,
} from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';
// KV への問い合わせ（@vercel/kv）の応答を Next に保存させない（GET だけの窓口では既定で保存され、古い値を返すため）
export const fetchCache = 'force-no-store';

// 管理モードの cookie を消す。サイト自身から有効な cookie で呼ばれた時は、ログインの世代を進めて
// それまでに発行した cookie をすべて無効にする（他所から呼ばせて全員をログアウトさせることはできない）
export async function POST(request: Request) {
  const guard = await guardAdminRequest(request);
  if ('response' in guard) return guard.response;

  let status = 200;
  try {
    if (isSameOriginRequest(request) && (await isAdminSession(request, guard.password))) {
      await revokeAllSessions();
    }
  } catch {
    // この端末の cookie は消すが、発行済みの cookie を無効にできなかったことは状態コードで伝える
    console.error('Admin logout could not revoke sessions (KV error)');
    status = 503;
  }

  const response = adminJson({ admin: false }, status);
  clearSessionCookie(response);
  return response;
}
