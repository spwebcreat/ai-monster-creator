import { kv } from '@vercel/kv';
import {
  LOGIN_FAILURE_DAY_KEY_SECONDS,
  LOGIN_FAILURE_LIMIT_PER_DAY,
  LOGIN_FAILURE_LIMIT_PER_IP,
  LOGIN_FAILURE_WINDOW_SECONDS,
  adminJson,
  getClientIp,
  getLoginFailureKeys,
  guardAdminRequest,
  isPasswordMatch,
  issueSessionToken,
  setSessionCookie,
} from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';
// KV への問い合わせ（@vercel/kv）の応答を Next に保存させない（GET だけの窓口では既定で保存され、古い値を返すため）
export const fetchCache = 'force-no-store';

const PASSWORD_MAX_LENGTH = 256;

// 試行の回数を 1 つ進めて、進めた後の回数を返す（期限も付け直す）
async function countAttempt(key: string, seconds: number): Promise<number> {
  const [count] = await Promise.all([kv.incr(key), kv.expire(key, seconds)]);
  return count;
}

// 本文 { password } が合言葉と一致すれば、管理モードの cookie を発行する
export async function POST(request: Request) {
  const guard = await guardAdminRequest(request);
  if ('response' in guard) return guard.response;

  const body: unknown = await request.json().catch(() => null);
  const password = body && typeof body === 'object' ? (body as Record<string, unknown>).password : undefined;
  if (typeof password !== 'string' || password.length === 0 || password.length > PASSWORD_MAX_LENGTH) {
    return adminJson({ error: 'Invalid request body' }, 400);
  }

  // 総当たり対策: 照合の前に試行を数える（同時に送られても、照合まで進めるのは上限の回数まで）。
  // 接続元の上限で断った試行は 1 日の回数に入れない（1 つの接続元から全体の上限を使い切られないように）
  const { ipKey, dayKey } = getLoginFailureKeys(getClientIp(request));
  try {
    if ((await countAttempt(ipKey, LOGIN_FAILURE_WINDOW_SECONDS)) > LOGIN_FAILURE_LIMIT_PER_IP) {
      return adminJson({ error: 'Too many attempts' }, 429);
    }
    if ((await countAttempt(dayKey, LOGIN_FAILURE_DAY_KEY_SECONDS)) > LOGIN_FAILURE_LIMIT_PER_DAY) {
      return adminJson({ error: 'Too many attempts' }, 429);
    }
  } catch {
    // 数えられない時は照合しない（上限が効かないまま照合させないため）
    console.error('Admin login unavailable (KV error)');
    return adminJson({ error: 'Login unavailable' }, 503);
  }

  if (!isPasswordMatch(password, guard.password)) {
    return adminJson({ error: 'Invalid password' }, 401);
  }

  let token: string;
  try {
    token = await issueSessionToken(guard.password);
  } catch {
    console.error('Admin login unavailable (KV error)');
    return adminJson({ error: 'Login unavailable' }, 503);
  }
  // 合言葉が正しかった回は数え戻す（上限は失敗の回数で数える）
  await Promise.all([
    kv.decr(ipKey),
    kv.expire(ipKey, LOGIN_FAILURE_WINDOW_SECONDS),
    kv.decr(dayKey),
    kv.expire(dayKey, LOGIN_FAILURE_DAY_KEY_SECONDS),
  ]).catch(() => console.error('Admin login attempt count not restored (KV error)'));

  const response = adminJson({ admin: true });
  setSessionCookie(response, token);
  return response;
}
