// 管理の窓口（/api/admin/*）の試験（偽の KV に向ける・本番の KV には触れない）
import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { idOf, importSrc, makeMonster, siteRequest, useFakeKv } from './helpers.mjs';

const PASSWORD = 'test-admin-password-0123';
const HOUR = 60 * 60 * 1000;

const fake = await useFakeKv();
const login = await importSrc('app/api/admin/login/route.ts');
const logout = await importSrc('app/api/admin/logout/route.ts');
const session = await importSrc('app/api/admin/session/route.ts');
const hide = await importSrc('app/api/admin/hide/route.ts');
const unhide = await importSrc('app/api/admin/unhide/route.ts');
const monsters = await importSrc('app/api/monsters/route.ts');
const {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_GENERATION_KEY,
  ADMIN_SESSION_SECRET_KEY,
  createSessionToken,
  getLoginFailureKeys,
} = await importSrc('app/lib/adminAuth.ts');

const keyOf = (n) => `monster:${idOf(n)}`;
const seed = (n, { all = true, recent = false } = {}) => {
  const monster = makeMonster(n);
  fake.setString(keyOf(n), JSON.stringify(monster));
  if (all) fake.zadd('all_monsters', Date.parse(monster.createdAt), keyOf(n));
  if (recent) fake.zadd('recent_monsters', Date.now(), keyOf(n));
};
const cookieOf = (token) => `${ADMIN_COOKIE_NAME}=${token}`;
const doLogin = (password, ip) => login.POST(siteRequest('/api/admin/login', { body: { password }, ip }));
// ログインして cookie（名前=値）を受け取る
const loginCookie = async (ip = '203.0.113.99') => {
  const response = await doLogin(PASSWORD, ip);
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';')[0];
};
// 今の KV の鍵・世代で cookie を作る（期限切れなどを作るため）
const currentKeys = (overrides = {}) => ({
  secret: fake.getString(ADMIN_SESSION_SECRET_KEY),
  generation: Number(fake.getString(ADMIN_SESSION_GENERATION_KEY)) || 0,
  password: PASSWORD,
  ...overrides,
});
const doHide = (id, options) => hide.POST(siteRequest('/api/admin/hide', { body: { id }, ...options }));
const doUnhide = (id, options) => unhide.POST(siteRequest('/api/admin/unhide', { body: { id }, ...options }));
const doLogout = (options) => logout.POST(siteRequest('/api/admin/logout', options));
const isAdmin = async (cookie) => (await (await session.GET(siteRequest('/api/admin/session', { method: 'GET', cookie }))).json()).admin;
const listedIds = async () => (await (await monsters.GET(new Request('http://localhost/api/monsters?limit=24'))).json()).monsters.map((m) => m.id);
const statuses = (responses) => responses.reduce((counts, { status }) => ({ ...counts, [status]: (counts[status] ?? 0) + 1 }), {});
const quietly = async (fn) => {
  const originalError = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = originalError;
  }
};
const withFailingKv = async (fn) => {
  fake.setFailing(true);
  try {
    return await quietly(fn);
  } finally {
    fake.setFailing(false);
  }
};

beforeEach(() => {
  fake.clear();
  process.env.ADMIN_PASSWORD = PASSWORD;
});
after(() => fake.close());

describe('ADMIN_PASSWORD が未設定', () => {
  test('管理の窓口はすべて 404 を返し、KV に触れない', async () => {
    delete process.env.ADMIN_PASSWORD;
    const cookie = cookieOf('0.1.x');
    const responses = [
      await doLogin(PASSWORD),
      await doLogout({ cookie }),
      await session.GET(siteRequest('/api/admin/session', { method: 'GET', cookie })),
      await doHide(idOf(1), { cookie }),
      await doUnhide(idOf(1), { cookie }),
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
    assert.match(setCookie, new RegExp(`^${ADMIN_COOKIE_NAME}=0\\.\\d+\\.[A-Za-z0-9_-]{43};`));
    for (const attribute of ['Path=/', 'Max-Age=43200', 'Secure', 'HttpOnly', 'SameSite=strict']) {
      assert.ok(setCookie.includes(attribute), attribute);
    }
    assert.equal(await isAdmin(setCookie.split(';')[0]), true);
  });

  test('署名の鍵は KV の専用の乱数で、最初のログインで 1 つだけ作る（同時のログインでも揃う）', async () => {
    const cookies = await Promise.all(Array.from({ length: 10 }, (_, i) => loginCookie(`198.51.100.${i + 1}`)));
    const secret = fake.getString(ADMIN_SESSION_SECRET_KEY);
    assert.match(secret, /^v1:[A-Za-z0-9_-]{43}$/);
    assert.ok(!secret.includes(PASSWORD));
    for (const cookie of cookies) assert.equal(await isAdmin(cookie), true);
    await loginCookie();
    assert.equal(fake.getString(ADMIN_SESSION_SECRET_KEY), secret);
    // 合言葉を鍵にした署名は通らない
    const [generation, expiresAt] = cookies[0].split('=')[1].split('.');
    const { createHmac } = await import('node:crypto');
    const signedWithPassword = createHmac('sha256', PASSWORD).update(`admin:${generation}:${expiresAt}`).digest('base64url');
    assert.equal(await isAdmin(cookieOf(`${generation}.${expiresAt}.${signedWithPassword}`)), false);
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

  test('cookie が無い・期限切れ・改ざん・別の鍵・別の世代のものは admin: false。合言葉を変えると無効', async () => {
    const valid = (await loginCookie()).split('=')[1];
    const [generation, expiresAt, signature] = valid.split('.');
    const tampered = `${generation}.${expiresAt}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
    const extended = `${generation}.${Number(expiresAt) + 12 * HOUR}.${signature}`;
    assert.equal(await isAdmin(undefined), false);
    assert.equal(await isAdmin(cookieOf(createSessionToken(currentKeys(), Date.now() - 12 * HOUR - 1000))), false);
    assert.equal(await isAdmin(cookieOf(tampered)), false);
    assert.equal(await isAdmin(cookieOf(extended)), false);
    assert.equal(await isAdmin(cookieOf(createSessionToken(currentKeys({ secret: 'v1:another-secret' })))), false);
    assert.equal(await isAdmin(cookieOf(createSessionToken(currentKeys({ generation: 1 })))), false);
    assert.equal(await isAdmin(cookieOf('garbage')), false);
    assert.equal(await isAdmin(cookieOf(valid)), true);
    process.env.ADMIN_PASSWORD = 'rotated-password';
    assert.equal(await isAdmin(cookieOf(valid)), false);
  });

  test('ログアウトは cookie を消し、世代を進めて発行済みの cookie をすべて無効にする', async () => {
    seed(1);
    const first = await loginCookie('198.51.100.1');
    const second = await loginCookie('198.51.100.2');
    const response = await doLogout({ cookie: first });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { admin: false });
    const setCookie = response.headers.get('set-cookie');
    assert.match(setCookie, new RegExp(`^${ADMIN_COOKIE_NAME}=;`));
    assert.ok(setCookie.includes('Max-Age=0'));
    // 別の端末の cookie も無効になり、外す操作は 401
    assert.equal(await isAdmin(first), false);
    assert.equal(await isAdmin(second), false);
    assert.equal((await doHide(idOf(1), { cookie: second })).status, 401);
    // もう一度ログインすれば使える
    const renewed = await loginCookie();
    assert.match(renewed, /=1\./);
    assert.equal((await doHide(idOf(1), { cookie: renewed })).status, 200);
  });

  test('他所から・cookie 無しで呼ばれたログアウトは、この cookie を消すだけで世代を進めない', async () => {
    const cookie = await loginCookie();
    assert.equal((await doLogout({ cookie, origin: 'https://evil.example' })).status, 200);
    assert.equal((await doLogout({ origin: null })).status, 200);
    assert.equal((await doLogout({})).status, 200);
    assert.equal(fake.getString(ADMIN_SESSION_GENERATION_KEY), null);
    assert.equal(await isAdmin(cookie), true);
  });

  test('KV が使えない時: 状態は admin: false、外す・戻すは 503、ログアウトは cookie を消して 503', async () => {
    seed(1);
    const cookie = await loginCookie();
    await withFailingKv(async () => {
      const state = await session.GET(siteRequest('/api/admin/session', { method: 'GET', cookie }));
      assert.equal(state.status, 200);
      assert.deepEqual(await state.json(), { admin: false });
      assert.equal((await doHide(idOf(1), { cookie })).status, 503);
      assert.equal((await doUnhide(idOf(1), { cookie })).status, 503);
      const out = await doLogout({ cookie });
      assert.equal(out.status, 503);
      assert.ok(out.headers.get('set-cookie').includes('Max-Age=0'));
    });
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
    // 試行の記録に生の IP を残さず、期限を付ける
    const failureKeys = fake.keys().filter((key) => key.startsWith('admin_login_fail:'));
    assert.ok(failureKeys.length > 0);
    assert.ok(failureKeys.every((key) => !key.includes('198.51.100')));
    assert.ok(fake.commands.some(([name, , seconds]) => name === 'expire' && seconds === '900'));
  });

  test('合言葉が正しかった回は数え戻す（続けてログインしても上限に届かない）', async () => {
    for (let i = 0; i < 10; i++) assert.equal((await doLogin(PASSWORD, '198.51.100.9')).status, 200);
    for (let i = 0; i < 5; i++) assert.equal((await doLogin('wrong', '198.51.100.9')).status, 401);
    assert.equal((await doLogin(PASSWORD, '198.51.100.9')).status, 429);
  });

  test('同じ接続元から 100 件を同時に送っても、照合まで進むのは 5 件まで', async () => {
    const attempts = Array.from({ length: 100 }, (_, i) => (i === 99 ? PASSWORD : `wrong-${i}`));
    const counts = statuses(await Promise.all(attempts.map((password) => doLogin(password, '198.51.100.10'))));
    assert.equal((counts[401] ?? 0) + (counts[200] ?? 0), 5, JSON.stringify(counts));
    assert.equal(counts[429], 95);
    assert.equal((await doLogin(PASSWORD, '198.51.100.10')).status, 429);
  });

  test('全体で 1 日 50 回失敗したら、新しい接続元からも 429', async () => {
    for (let i = 0; i < 50; i++) {
      assert.equal((await doLogin('wrong', `203.0.113.${Math.floor(i / 5) + 10}`)).status, 401, `attempt ${i + 1}`);
    }
    assert.equal((await doLogin(PASSWORD, '203.0.113.200')).status, 429);
  });

  test('1 日の上限も同時送信で守られる（100 の接続元から同時に 100 件）', async () => {
    const counts = statuses(await Promise.all(Array.from({ length: 100 }, (_, i) => doLogin('wrong', `192.0.2.${i + 1}`))));
    assert.deepEqual(counts, { 401: 50, 429: 50 });
    assert.equal((await doLogin(PASSWORD, '192.0.2.200')).status, 429);
  });

  test('接続元の上限で断った試行は 1 日の回数に入れない', async () => {
    for (let i = 0; i < 20; i++) await doLogin('wrong', '198.51.100.11');
    const { dayKey } = getLoginFailureKeys('198.51.100.11');
    assert.equal(fake.getString(dayKey), '5');
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

  test('KV が使えない時は照合せずに 503（正しい合言葉でも通さない）', async () => {
    await withFailingKv(async () => {
      assert.equal((await doLogin(PASSWORD)).status, 503);
      assert.equal((await doLogin('wrong')).status, 503);
    });
  });
});

describe('一覧から外す・戻す', () => {
  test('cookie が無い・期限切れ・改ざんは 401、Origin が違う・無い時は 403', async () => {
    seed(1);
    const id = idOf(1);
    const cookie = await loginCookie();
    const expired = cookieOf(createSessionToken(currentKeys(), Date.now() - 13 * HOUR));
    const tampered = cookie.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
    for (const call of [doHide, doUnhide]) {
      assert.equal((await call(id, {})).status, 401);
      assert.equal((await call(id, { cookie: expired })).status, 401);
      assert.equal((await call(id, { cookie: tampered })).status, 401);
      assert.equal((await call(id, { cookie, origin: 'https://evil.example' })).status, 403);
      assert.equal((await call(id, { cookie, origin: 'http://amc.example' })).status, 403);
      assert.equal((await call(id, { cookie, origin: null })).status, 403);
    }
    assert.deepEqual(fake.zmembers('all_monsters'), [keyOf(1)]);
  });

  test('id が UUID でなければ 400、知らない id は 404', async () => {
    const cookie = await loginCookie();
    assert.equal((await doHide('not-a-uuid', { cookie })).status, 400);
    assert.equal((await doHide(undefined, { cookie })).status, 400);
    assert.equal((await doHide(idOf(99), { cookie })).status, 404);
    assert.equal((await doUnhide(idOf(99), { cookie })).status, 404);
  });

  test('外すと両方の索引から消え、hidden_monsters に記録が残る。本体は消さない。戻すと元の位置に戻る', async () => {
    for (const n of [1, 2, 3]) seed(n, { recent: true });
    const cookie = await loginCookie();
    const before = Date.now();
    const hidden = await doHide(idOf(2), { cookie });
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
    assert.equal((await doHide(idOf(2), { cookie })).status, 200);
    assert.equal(JSON.parse(fake.hget('hidden_monsters', idOf(2))).hiddenAt, record.hiddenAt);

    const restored = await doUnhide(idOf(2), { cookie });
    assert.equal(restored.status, 200);
    assert.deepEqual(await restored.json(), { id: idOf(2), hidden: false });
    assert.equal(fake.zscore('all_monsters', keyOf(2)), record.score);
    assert.equal(fake.zscore('recent_monsters', keyOf(2)), null);
    assert.equal(fake.hget('hidden_monsters', idOf(2)), null);
    assert.deepEqual(await listedIds(), [idOf(3), idOf(2), idOf(1)]);
    // もう一度戻しても変わらない
    assert.equal((await doUnhide(idOf(2), { cookie })).status, 200);
  });

  test('全件の索引を作る前（recent_monsters にだけある）でも外せ、戻すと all_monsters に作成日時の score で入る', async () => {
    seed(5, { all: false, recent: true });
    const cookie = await loginCookie();
    assert.equal((await doHide(idOf(5), { cookie })).status, 200);
    assert.equal(fake.zscore('recent_monsters', keyOf(5)), null);
    assert.equal(JSON.parse(fake.hget('hidden_monsters', idOf(5))).score, Date.parse(makeMonster(5).createdAt));
    assert.equal((await doUnhide(idOf(5), { cookie })).status, 200);
    assert.equal(fake.zscore('all_monsters', keyOf(5)), Date.parse(makeMonster(5).createdAt));
  });

  test('応答と KV に合言葉と cookie の値を残さない', async () => {
    seed(1);
    const cookie = await loginCookie();
    await doLogin('wrong');
    const response = await doHide(idOf(1), { cookie });
    const text = await response.text();
    const stored = fake.snapshot() + JSON.stringify(fake.commands);
    for (const secret of [PASSWORD, cookie.split('=')[1]]) {
      assert.ok(!text.includes(secret));
      assert.ok(!stored.includes(secret));
    }
  });
});
