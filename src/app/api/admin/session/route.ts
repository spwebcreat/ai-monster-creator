import { adminJson, guardAdminRequest, isAdminSession } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 管理モードの cookie が有効か（画面側が管理用の操作を出すかの判断に使う）
export async function GET(request: Request) {
  const guard = guardAdminRequest(request);
  if ('response' in guard) return guard.response;

  return adminJson({ admin: isAdminSession(request, guard.password) });
}
