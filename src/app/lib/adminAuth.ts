// 管理モード（サイトの管理者が一覧からモンスターを外す操作）の認証。管理の窓口（/api/admin/*）で共有する。
// 合言葉は環境変数 ADMIN_PASSWORD（NEXT_PUBLIC_ を付けない＝ブラウザ用の JS に入らない）。未設定なら窓口はすべて 404。
// ログイン中の印は HttpOnly の cookie に「世代.期限.署名」を入れる。
// - 署名の鍵は KV に置く専用の乱数（admin_session_secret・最初のログインで作る）。合言葉そのものは鍵に使わない
//   （cookie が漏れても、手元で合言葉を総当たりできないように）
// - 世代（admin_session_gen）はログアウトで進め、それまでに発行した cookie をすべて無効にする
// - 署名する文には合言葉のハッシュも含め、合言葉を変えた時も発行済みの cookie を無効にする
// 応答・ログに合言葉・鍵・cookie の値を出さない
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const ADMIN_COOKIE_NAME = '__Host-amc_admin';
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

// cookie の署名の鍵と、ログインの世代を置く KV のキー
export const ADMIN_SESSION_SECRET_KEY = 'admin_session_secret';
export const ADMIN_SESSION_GENERATION_KEY = 'admin_session_gen';

// ログインの試行の上限（KV で数える）。接続元ごとに 15 分の区切りで 5 回まで、全体で 1 日（UTC）50 回まで。
// 照合の前に数え、合言葉が正しかった回は数え戻す（＝上限は失敗の回数）。上限まで失敗した後の試行は、合言葉が正しくても 429
export const LOGIN_FAILURE_LIMIT_PER_IP = 5;
export const LOGIN_FAILURE_WINDOW_SECONDS = 15 * 60;
export const LOGIN_FAILURE_LIMIT_PER_DAY = 50;
export const LOGIN_FAILURE_DAY_KEY_SECONDS = 2 * 24 * 60 * 60;

// 別のサーバーで発行した cookie を、時計のずれで「期限が先すぎる」と弾かないための余裕
const CLOCK_SKEW_MS = 60 * 1000;

// 鍵の値の頭に付ける印（@vercel/kv が JSON として読み直して数などに変えないように）
const SECRET_PREFIX = 'v1:';

const TOKEN_PATTERN = /^(\d{1,15})\.(\d{1,15})\.([A-Za-z0-9_-]{43})$/;

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

// 署名に使う材料（KV の鍵と世代、環境変数の合言葉）
export interface SessionKeys {
  secret: string;
  generation: number;
  password: string;
}

const sign = ({ secret, generation, password }: SessionKeys, expiresAt: number) =>
  createHmac('sha256', secret)
    .update(`admin:${generation}:${expiresAt}:${sha256(password).toString('hex')}`)
    .digest('base64url');

export function createSessionToken(keys: SessionKeys, now = Date.now()): string {
  const expiresAt = now + ADMIN_SESSION_SECONDS * 1000;
  return `${keys.generation}.${expiresAt}.${sign(keys, expiresAt)}`;
}

// cookie の値が、今の鍵・世代・合言葉で署名された期限内のものか
export function isValidSessionToken(token: string | undefined, keys: SessionKeys, now = Date.now()): boolean {
  const match = token ? TOKEN_PATTERN.exec(token) : null;
  if (!match) return false;
  if (Number(match[1]) !== keys.generation) return false;
  const expiresAt = Number(match[2]);
  if (expiresAt <= now || expiresAt > now + ADMIN_SESSION_SECONDS * 1000 + CLOCK_SKEW_MS) return false;
  // 署名は文字のまま比べる（バイト列に戻すと、末尾の文字の余りのビットだけ違う別の表記も通ってしまう）
  const expected = Buffer.from(sign(keys, expiresAt));
  const actual = Buffer.from(match[3]);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// KV から鍵と世代を読む（KV が使えない時は例外）。鍵がまだ無ければ secret は null
async function readSessionState(): Promise<{ secret: string | null; generation: number }> {
  const [secret, generation] = await kv.mget<unknown[]>(ADMIN_SESSION_SECRET_KEY, ADMIN_SESSION_GENERATION_KEY);
  return {
    secret: typeof secret === 'string' && secret.startsWith(SECRET_PREFIX) ? secret : null,
    generation: Number(generation) || 0,
  };
}

// ログインに成功した時の cookie の値を作る。鍵がまだ無ければ乱数で作る（同時に作られても SET NX で 1 つに揃う）
export async function issueSessionToken(password: string): Promise<string> {
  let state = await readSessionState();
  if (!state.secret) {
    await kv.set(ADMIN_SESSION_SECRET_KEY, `${SECRET_PREFIX}${randomBytes(32).toString('base64url')}`, { nx: true });
    state = await readSessionState();
  }
  if (!state.secret) throw new Error('Admin session secret unavailable');
  return createSessionToken({ secret: state.secret, generation: state.generation, password });
}

// ログインの世代を進め、発行済みの cookie をすべて無効にする
export async function revokeAllSessions(): Promise<void> {
  await kv.incr(ADMIN_SESSION_GENERATION_KEY);
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

// 有効な cookie を持ったリクエストか（cookie がある時だけ KV を読む。KV が使えない時は例外）
export async function isAdminSession(request: Request, password: string): Promise<boolean> {
  const token = readCookie(request, ADMIN_COOKIE_NAME);
  if (!token || !TOKEN_PATTERN.test(token)) return false;
  const { secret, generation } = await readSessionState();
  return secret !== null && isValidSessionToken(token, { secret, generation, password });
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

// ログインの試行を数える KV のキー。接続元は生の IP を残さないようハッシュにし、15 分ごとの区切りを付ける
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

// 管理の窓口の入口の確かめ。合言葉が未設定なら 404、Origin が違えば 403、ログインしていなければ 401、
// ログインを確かめられない（KV が使えない）なら 503
export async function guardAdminRequest(
  request: Request,
  { sameOrigin = false, session = false }: { sameOrigin?: boolean; session?: boolean } = {}
): Promise<{ password: string } | { response: NextResponse }> {
  const password = getAdminPassword();
  if (!password) return { response: adminJson({ error: 'Not Found' }, 404) };
  if (sameOrigin && !isSameOriginRequest(request)) return { response: adminJson({ error: 'Forbidden' }, 403) };
  if (session) {
    let isAdmin: boolean;
    try {
      isAdmin = await isAdminSession(request, password);
    } catch {
      console.error('Admin session check unavailable (KV error)');
      return { response: adminJson({ error: 'Storage unavailable' }, 503) };
    }
    if (!isAdmin) return { response: adminJson({ error: 'Unauthorized' }, 401) };
  }
  return { password };
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(ADMIN_COOKIE_NAME, token, { ...sessionCookieOptions, maxAge: ADMIN_SESSION_SECONDS });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE_NAME, '', { ...sessionCookieOptions, maxAge: 0 });
}
