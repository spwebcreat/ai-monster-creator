// 管理モード（サイトの管理者が一覧からモンスターを外す操作）の認証。管理の窓口（/api/admin/*）で共有する。
// 合言葉は環境変数 ADMIN_PASSWORD（NEXT_PUBLIC_ を付けない＝ブラウザ用の JS に入らない）。未設定なら窓口はすべて 404。
// ログイン中の印は HttpOnly の cookie に「期限.署名」を入れる。署名は合言葉を鍵にした HMAC-SHA256 なので、
// 合言葉を変えると発行済みの cookie はすべて無効になる。応答・ログに合言葉と cookie の値を出さない
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

export const ADMIN_COOKIE_NAME = '__Host-amc_admin';
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

// ログイン失敗の上限（KV で数える）。接続元ごとに 15 分の区切りで 5 回まで、全体で 1 日（UTC）50 回まで。
// 上限まで失敗した後の試行は、合言葉が正しくても 429 で受け付けない
export const LOGIN_FAILURE_LIMIT_PER_IP = 5;
export const LOGIN_FAILURE_WINDOW_SECONDS = 15 * 60;
export const LOGIN_FAILURE_LIMIT_PER_DAY = 50;

// 別のサーバーで発行した cookie を、時計のずれで「期限が先すぎる」と弾かないための余裕
const CLOCK_SKEW_MS = 60 * 1000;

const sessionCookieOptions = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' } as const;

export function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  return password ? password : null;
}

const sha256 = (text: string) => createHash('sha256').update(text).digest();

// 合言葉の照合。長さの違いで早く終わらないよう、両方を同じ長さのハッシュにしてから比べる
export function isPasswordMatch(input: string, password: string): boolean {
  return timingSafeEqual(sha256(input), sha256(password));
}

const sign = (password: string, expiresAt: number) =>
  createHmac('sha256', password).update(`admin:${expiresAt}`).digest('base64url');

export function createSessionToken(password: string, now = Date.now()): string {
  const expiresAt = now + ADMIN_SESSION_SECONDS * 1000;
  return `${expiresAt}.${sign(password, expiresAt)}`;
}

// cookie の値が、今の合言葉で署名された期限内のものか
export function isValidSessionToken(token: string | undefined, password: string, now = Date.now()): boolean {
  const match = token ? /^(\d{1,15})\.([A-Za-z0-9_-]{43})$/.exec(token) : null;
  if (!match) return false;
  const expiresAt = Number(match[1]);
  if (expiresAt <= now || expiresAt > now + ADMIN_SESSION_SECONDS * 1000 + CLOCK_SKEW_MS) return false;
  // 署名は文字のまま比べる（バイト列に戻すと、末尾の文字の余りのビットだけ違う別の表記も通ってしまう）
  const expected = Buffer.from(sign(password, expiresAt));
  const actual = Buffer.from(match[2]);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

export function isAdminSession(request: Request, password: string): boolean {
  return isValidSessionToken(readCookie(request, ADMIN_COOKIE_NAME), password);
}

const firstValue = (value: string | null) => value?.split(',')[0]?.trim().toLowerCase() || null;

// Origin ヘッダーがサイト自身か（Vercel ではサイトのホストと https が x-forwarded-host・x-forwarded-proto に入る）
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin')?.toLowerCase();
  const host = firstValue(request.headers.get('x-forwarded-host')) ?? firstValue(request.headers.get('host'));
  if (!origin || !host) return false;
  const proto = firstValue(request.headers.get('x-forwarded-proto')) ?? new URL(request.url).protocol.replace(/:$/, '');
  return origin === `${proto}://${host}`;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

// ログイン失敗を数える KV のキー。接続元は生の IP を残さないようハッシュにし、15 分ごとの区切りを付ける
// （期限の設定に失敗したキーが残っても、区切りが変われば数え直しになる）
export function getLoginFailureKeys(ip: string, now = Date.now()): { ipKey: string; dayKey: string } {
  const window = Math.floor(now / (LOGIN_FAILURE_WINDOW_SECONDS * 1000));
  const ipHash = sha256(ip).toString('hex').slice(0, 32);
  const day = new Date(now).toISOString().slice(0, 10);
  return { ipKey: `admin_login_fail:ip:${ipHash}:${window}`, dayKey: `admin_login_fail:day:${day}` };
}

// 管理の窓口の応答（CDN やブラウザに残さない）
export function adminJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

// 管理の窓口の入口の確かめ。合言葉が未設定なら 404、Origin が違えば 403、ログインしていなければ 401
export function guardAdminRequest(
  request: Request,
  { sameOrigin = false, session = false }: { sameOrigin?: boolean; session?: boolean } = {}
): { password: string } | { response: NextResponse } {
  const password = getAdminPassword();
  if (!password) return { response: adminJson({ error: 'Not Found' }, 404) };
  if (sameOrigin && !isSameOriginRequest(request)) return { response: adminJson({ error: 'Forbidden' }, 403) };
  if (session && !isAdminSession(request, password)) return { response: adminJson({ error: 'Unauthorized' }, 401) };
  return { password };
}

export function setSessionCookie(response: NextResponse, password: string): void {
  response.cookies.set(ADMIN_COOKIE_NAME, createSessionToken(password), {
    ...sessionCookieOptions,
    maxAge: ADMIN_SESSION_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE_NAME, '', { ...sessionCookieOptions, maxAge: 0 });
}
