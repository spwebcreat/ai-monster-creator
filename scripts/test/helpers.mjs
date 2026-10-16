// 試験の共通部品。src/ の .ts を読む解決フックを登録し、偽の KV に向けた環境を用意する
import '../lib/registerSrcAlias.mjs';
import { startFakeKv } from './fakeKvServer.mjs';

export const BLOB_ORIGIN = 'https://byc8tublolbhhpzq.public.blob.vercel-storage.com';
export const SITE_ORIGIN = 'https://amc.example';

// 決まった形の UUID（v4 の形）
export const idOf = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// 検証に合うモンスター。作成日時は 2025-01-01 から n 分後
export function makeMonster(n, overrides = {}) {
  return {
    id: idOf(n),
    imageUrl: `${BLOB_ORIGIN}/monsters/${n}-abc.png`,
    description: `テスト${n}`,
    attribute: '火',
    type: 'Humanoid',
    job: 'Warrior',
    gender: 'male',
    createdAt: new Date(Date.UTC(2025, 0, 1) + n * 60_000).toISOString(),
    ...overrides,
  };
}

// 偽の KV を立て、アプリと同じ環境変数で向ける（@vercel/kv は最初に使う時に環境変数を読む）
export async function useFakeKv() {
  const fake = await startFakeKv();
  process.env.KV_REST_API_URL = fake.url;
  process.env.KV_REST_API_TOKEN = fake.token;
  return fake;
}

export const importSrc = (path) => import(new URL(`../../src/${path}`, import.meta.url).href);

// 管理の窓口へのリクエスト（既定はサイト自身の Origin から）
export function siteRequest(path, { method = 'POST', body, cookie, origin = SITE_ORIGIN, ip = '203.0.113.1' } = {}) {
  const headers = { host: 'amc.example', 'x-forwarded-proto': 'https', 'x-forwarded-for': ip };
  if (origin) headers.origin = origin;
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  return new Request(`${SITE_ORIGIN}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}
