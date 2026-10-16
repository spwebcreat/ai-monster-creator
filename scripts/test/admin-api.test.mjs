// 管理の窓口（/api/admin/*）の試験（偽の KV に向ける・本番の KV には触れない）
import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { idOf, importSrc, makeMonster, siteRequest, useFakeKv } from './helpers.mjs';

const PASSWORD = 'test-admin-password-0123';

const fake = await useFakeKv();
const login = await importSrc('app/api/admin/login/route.ts');
const logout = await importSrc('app/api/admin/logout/route.ts');
const session = await importSrc('app/api/admin/session/route.ts');
const hide = await importSrc('app/api/admin/hide/route.ts');
const unhide = await importSrc('app/api/admin/unhide/route.ts');
const monsters = await importSrc('app/api/monsters/route.ts');
const { ADMIN_COOKIE_NAME, createSessionToken } = await importSrc('app/lib/adminAuth.ts');

const keyOf = (n) => `monster:${idOf(n)}`;
const seed = (n, { all = true, recent = false } = {}) => {
  const monster = makeMonster(n);
  fake.setString(keyOf(n), JSON.stringify(monster));
  if (all) fake.zadd('all_monsters', Date.parse(monster.createdAt), keyOf(n));
  if (recent) fake.zadd('recent_monsters', Date.now(), keyOf(n));
};
const cookieOf = (token) => `${ADMIN_COOKIE_NAME}=${token}`;
const validCookie = () => cookieOf(createSessionToken(PASSWORD));
const doLogin = (password, ip) => login.POST(siteRequest('/api/admin/login', { body: { password }, ip }));
const doHide = (id, options = {}) => hide.POST(siteRequest('/api/admin/hide', { cookie: validCookie(), body: { id }, ...options }));
const doUnhide = (id, options = {}) => unhide.POST(siteRequest('/api/admin/unhide', { cookie: validCookie(), body: { id }, ...options }));
const isAdmin = async (cookie) => (await (await session.GET(siteRequest('/api/admin/session', { method: 'GET', cookie }))).json()).admin;
const listedIds = async () => (await (await monsters.GET(new Request('http://localhost/api/monsters?limit=24'))).json()).monsters.map((m) => m.id);

beforeEach(() => {
  fake.clear();
  process.env.ADMIN_PASSWORD = PASSWORD;
});
after(() => fake.close());

describe('ADMIN_PASSWORD が未設定', () => {
  test('管理の窓口はすべて 404 を返し、KV に触れない', async () => {
    delete process.env.ADMIN_PASSWORD;
    const responses = [
      await doLogin(PASSWORD),
      await logout.POST(siteRequest('/api/admin/logout')),
      await session.GET(siteRequest('/api/admin/session', { method: 'GET', cookie: validCookie() })),
      await doHide(idOf(1)),
      await doUnhide(idOf(1)),
    ];
    assert.deepEqual(responses.map((response) => response.status), [404, 404, 404, 404, 404]);
    assert.deepEqual(fake.commands, []);
  });
});

describe('ログイン・ログアウト・状態', () => {
  test('合言葉が一致すれば HttpOnly・Secure・SameSite=Strict・Path=/・12 時間の cookie を発行する', async () => {
    const response = await doLogin(PASSWORD);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { admin: true });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const setCookie = response.headers.get('set-cookie');
    assert.match(setCookie, new RegExp(`^${ADMIN_COOKIE_NAME}=\\d+\\.[A-Za-z0-9_-]{43};`));
    for (const attribute of ['Path=/', 'Max-Age=43200', 'Secure', 'HttpOnly', 'SameSite=strict']) {
      assert.ok(setCookie.includes(attribute), attribute);
    }
    assert.ok(!setCookie.includes(PASSWORD));
    const cookie = setCookie.split(';')[0];
    assert.equal(await isAdmin(cookie), true);
  });

  test('合言葉が違えば 401、本文が無い・形が違えば 400', async () => {
    const wrong = await doLogin('wrong-password');
    assert.equal(wrong.status, 401);
    assert.equal(wrong.headers.get('set-cookie'), null);
    assert.ok(!(await wrong.text()).includes(PASSWORD));
    assert.equal((await doLogin(12345)).status, 400);
    assert.equal((await doLogin('')).status, 400);
    assert.equal((await login.POST(siteRequest('/api/admin/login', { body: 'not json' }))).status, 400);
  });

  test('cookie が無い・期限切れ・改ざん・別の合言葉で署名したものは admin: false', async () => {
    const twelveHours = 12 * 60 * 60 * 1000;
    const valid = createSessionToken(PASSWORD);
    const [expiresAt, signature] = valid.split('.');
    const tampered = `${expiresAt}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
    const extended = `${Number(expiresAt) + twelveHours}.${signature}`;
    assert.equal(await isAdmin(undefined), false);
    assert.equal(await isAdmin(cookieOf(createSessionToken(PASSWORD, Date.now() - twelveHours - 1000))), false);
    assert.equal(await isAdmin(cookieOf(tampered)), false);
    assert.equal(await isAdmin(cookieOf(extended)), false);
    assert.equal(await isAdmin(cookieOf(createSessionToken('another-password'))), false);
    assert.equal(await isAdmin(cookieOf('garbage')), false);
    assert.equal(await isAdmin(cookieOf(valid)), true);
    // 合言葉を変えると発行済みの cookie は無効になる
    process.env.ADMIN_PASSWORD = 'rotated-password';
    assert.equal(await isAdmin(cookieOf(valid)), false);
  });

  test('ログアウトは cookie を消す', async () => {
    const response = await logout.POST(siteRequest('/api/admin/logout', { cookie: validCookie() }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { admin: false });
    const setCookie = response.headers.get('set-cookie');
    assert.match(setCookie, new RegExp(`^${ADMIN_COOKIE_NAME}=;`));
    assert.ok(setCookie.includes('Max-Age=0'));
  });
});

describe('総当たり対策', () => {
  test('同じ接続元は 15 分で 5 回まで。6 回目からは合言葉が正しくても 429', async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      assert.equal((await doLogin(`wrong-${attempt}`, '198.51.100.7')).status, 401, `attempt ${attempt}`);
    }
    assert.equal((await doLogin('wrong-6', '198.51.100.7')).status, 429);
    assert.equal((await doLogin(PASSWORD, '198.51.100.7')).status, 429);
    // 別の接続元は通る
    assert.equal((await doLogin(PASSWORD, '198.51.100.8')).status, 200);
    // 失敗の回数の記録に生の IP を残さず、期限を付ける
    const failureKeys = fake.keys().filter((key) => key.startsWith('admin_login_fail:'));
    assert.ok(failureKeys.length > 0);
    assert.ok(failureKeys.every((key) => !key.includes('198.51.100')));
    const ttls = fake.commands.filter(([name]) => name === 'expire');
    assert.ok(ttls.some(([, , seconds]) => seconds === '900'));
  });

  test('x-forwarded-for が無ければ x-real-ip で数える', async () => {
    const attempt = (password) => login.POST(new Request('https://amc.example/api/admin/login', {
      method: 'POST',
      headers: { host: 'amc.example', 'x-real-ip': '192.0.2.44', 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    }));
    for (let i = 0; i < 5; i++) assert.equal((await attempt('wrong')).status, 401);
    assert.equal((await attempt(PASSWORD)).status, 429);
    assert.equal((await doLogin(PASSWORD, '192.0.2.45')).status, 200);
  });

  test('全体で 1 日 50 回失敗したら、新しい接続元からも 429', async () => {
    for (let i = 0; i < 50; i++) {
      assert.equal((await doLogin('wrong', `203.0.113.${Math.floor(i / 5) + 10}`)).status, 401, `attempt ${i + 1}`);
    }
    assert.equal((await doLogin(PASSWORD, '203.0.113.200')).status, 429);
  });

  test('KV が使えない時は照合せずに 503', async () => {
    fake.setFailing(true);
    const originalError = console.error;
    console.error = () => {};
    try {
      assert.equal((await doLogin(PASSWORD)).status, 503);
    } finally {
      console.error = originalError;
      fake.setFailing(false);
    }
  });
});

describe('一覧から外す・戻す', () => {
  test('cookie が無い・期限切れ・改ざんは 401、Origin が違う・無い時は 403', async () => {
    seed(1);
    const id = idOf(1);
    const expired = cookieOf(createSessionToken(PASSWORD, Date.now() - 13 * 60 * 60 * 1000));
    const tampered = validCookie().replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
    for (const route of [hide, unhide]) {
      const path = route === hide ? '/api/admin/hide' : '/api/admin/unhide';
      const call = (options) => route.POST(siteRequest(path, { body: { id }, ...options }));
      assert.equal((await call({})).status, 401);
      assert.equal((await call({ cookie: expired })).status, 401);
      assert.equal((await call({ cookie: tampered })).status, 401);
      assert.equal((await call({ cookie: validCookie(), origin: 'https://evil.example' })).status, 403);
      assert.equal((await call({ cookie: validCookie(), origin: 'http://amc.example' })).status, 403);
      assert.equal((await call({ cookie: validCookie(), origin: null })).status, 403);
    }
    assert.deepEqual(fake.zmembers('all_monsters'), [keyOf(1)]);
  });

  test('id が UUID でなければ 400、知らない id は 404', async () => {
    assert.equal((await doHide('not-a-uuid')).status, 400);
    assert.equal((await doHide(undefined)).status, 400);
    assert.equal((await doHide(idOf(99))).status, 404);
    assert.equal((await doUnhide(idOf(99))).status, 404);
  });

  test('外すと両方の索引から消え、hidden_monsters に記録が残る。本体は消さない。戻すと元の位置に戻る', async () => {
    for (const n of [1, 2, 3]) seed(n, { recent: true });
    const before = Date.now();
    const hidden = await doHide(idOf(2));
    assert.equal(hidden.status, 200);
    assert.deepEqual(await hidden.json(), { id: idOf(2), hidden: true });
    assert.equal(fake.zscore('all_monsters', keyOf(2)), null);
    assert.equal(fake.zscore('recent_monsters', keyOf(2)), null);
    assert.ok(fake.getString(keyOf(2)));
    const record = JSON.parse(fake.hget('hidden_monsters', idOf(2)));
    assert.equal(record.score, Date.parse(makeMonster(2).createdAt));
    assert.ok(record.hiddenAt >= before);
    assert.deepEqual(await listedIds(), [idOf(3), idOf(1)]);

    // もう一度外しても最初の記録を保つ
    assert.equal((await doHide(idOf(2))).status, 200);
    assert.equal(JSON.parse(fake.hget('hidden_monsters', idOf(2))).hiddenAt, record.hiddenAt);

    const restored = await doUnhide(idOf(2));
    assert.equal(restored.status, 200);
    assert.deepEqual(await restored.json(), { id: idOf(2), hidden: false });
    assert.equal(fake.zscore('all_monsters', keyOf(2)), record.score);
    assert.equal(fake.zscore('recent_monsters', keyOf(2)), null);
    assert.equal(fake.hget('hidden_monsters', idOf(2)), null);
    assert.deepEqual(await listedIds(), [idOf(3), idOf(2), idOf(1)]);
    // もう一度戻しても変わらない
    assert.equal((await doUnhide(idOf(2))).status, 200);
  });

  test('全件の索引を作る前（recent_monsters にだけある）でも外せ、戻すと all_monsters に作成日時の score で入る', async () => {
    seed(5, { all: false, recent: true });
    assert.equal((await doHide(idOf(5))).status, 200);
    assert.equal(fake.zscore('recent_monsters', keyOf(5)), null);
    assert.equal(JSON.parse(fake.hget('hidden_monsters', idOf(5))).score, Date.parse(makeMonster(5).createdAt));
    assert.equal((await doUnhide(idOf(5))).status, 200);
    assert.equal(fake.zscore('all_monsters', keyOf(5)), Date.parse(makeMonster(5).createdAt));
  });

  test('応答と KV に合言葉と cookie の値を残さない', async () => {
    seed(1);
    const cookie = validCookie();
    await doLogin(PASSWORD);
    await doLogin('wrong');
    const response = await hide.POST(siteRequest('/api/admin/hide', { cookie, body: { id: idOf(1) } }));
    const text = await response.text();
    const stored = fake.snapshot() + JSON.stringify(fake.commands);
    for (const secret of [PASSWORD, cookie.split('=')[1]]) {
      assert.ok(!text.includes(secret));
      assert.ok(!stored.includes(secret));
    }
  });
});
