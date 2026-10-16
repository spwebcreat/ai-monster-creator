import { adminJson, guardAdminRequest, isAdminSession } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';
// KV への問い合わせ（@vercel/kv）の応答を Next に保存させない（GET だけの窓口では既定で保存され、古い値を返すため）
export const fetchCache = 'force-no-store';

// 管理モードの cookie が有効か（画面側が管理用の操作を出すかの判断に使う）。確かめられない時は admin: false
export async function GET(request: Request) {
  const guard = await guardAdminRequest(request);
  if ('response' in guard) return guard.response;

  let admin = false;
  try {
    admin = await isAdminSession(request, guard.password);
  } catch {
    console.error('Admin session check unavailable (KV error)');
  }
  return adminJson({ admin });
}
