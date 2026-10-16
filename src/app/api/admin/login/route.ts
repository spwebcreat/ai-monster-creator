import { kv } from '@vercel/kv';
import {
  LOGIN_FAILURE_LIMIT_PER_DAY,
  LOGIN_FAILURE_LIMIT_PER_IP,
  LOGIN_FAILURE_WINDOW_SECONDS,
  adminJson,
  getClientIp,
  getLoginFailureKeys,
  guardAdminRequest,
  isPasswordMatch,
  setSessionCookie,
} from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

const PASSWORD_MAX_LENGTH = 256;

// 本文 { password } が合言葉と一致すれば、管理モードの cookie を発行する
export async function POST(request: Request) {
  const guard = guardAdminRequest(request);
  if ('response' in guard) return guard.response;

  const body: unknown = await request.json().catch(() => null);
  const password = body && typeof body === 'object' ? (body as Record<string, unknown>).password : undefined;
  if (typeof password !== 'string' || password.length === 0 || password.length > PASSWORD_MAX_LENGTH) {
    return adminJson({ error: 'Invalid request body' }, 400);
  }

  // 総当たり対策: 失敗の回数が上限に達していれば、合言葉を照合せずに断る
  const { ipKey, dayKey } = getLoginFailureKeys(getClientIp(request));
  try {
    const [ipFailures, dayFailures] = await kv.mget<(number | null)[]>(ipKey, dayKey);
    if ((Number(ipFailures) || 0) >= LOGIN_FAILURE_LIMIT_PER_IP || (Number(dayFailures) || 0) >= LOGIN_FAILURE_LIMIT_PER_DAY) {
      return adminJson({ error: 'Too many attempts' }, 429);
    }
  } catch {
    // 回数を確かめられない時は受け付けない（上限が効かないまま照合させないため）
    console.error('Admin login unavailable (KV error)');
    return adminJson({ error: 'Login unavailable' }, 503);
  }

  if (!isPasswordMatch(password, guard.password)) {
    try {
      await Promise.all([
        kv.incr(ipKey),
        kv.expire(ipKey, LOGIN_FAILURE_WINDOW_SECONDS),
        kv.incr(dayKey),
        kv.expire(dayKey, 2 * 24 * 60 * 60),
      ]);
    } catch {
      console.error('Admin login failure count unavailable (KV error)');
    }
    return adminJson({ error: 'Invalid password' }, 401);
  }

  const response = adminJson({ admin: true });
  setSessionCookie(response, guard.password);
  return response;
}
