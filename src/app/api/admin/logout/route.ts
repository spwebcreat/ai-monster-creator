import { adminJson, clearSessionCookie, guardAdminRequest } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 管理モードの cookie を消す
export async function POST(request: Request) {
  const guard = guardAdminRequest(request);
  if ('response' in guard) return guard.response;

  const response = adminJson({ admin: false });
  clearSessionCookie(response);
  return response;
}
