// 試験用の偽の KV。Upstash の REST（@vercel/kv が話す形）の受け答えを真似る、メモリ上だけのサーバー。
// 本物のクライアントのまま試せるよう、単発の命令・/pipeline・/multi-exec と、Upstash-Encoding: base64 の応答に対応する。
// 使う命令だけを実装している（足りない命令は「unknown command」のエラーを返す）
import http from 'node:http';

const OK = Symbol('OK');

// 書き込みの命令（試し実行で使われていないことを確かめる）
export const WRITE_COMMANDS = new Set([
  'set', 'del', 'incr', 'decr', 'expire', 'zadd', 'zrem', 'zremrangebyrank', 'hset', 'hdel',
]);

class CommandError extends Error {}

const wrongType = () => new CommandError('WRONGTYPE Operation against a key holding the wrong kind of value');

const globToRegExp = (glob) =>
  new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);

// Redis と同じ順（score の昇順、同じ score は要素の辞書順）
const sortZset = (zset) =>
  [...zset].sort(([memberA, scoreA], [memberB, scoreB]) =>
    scoreA !== scoreB ? scoreA - scoreB : memberA < memberB ? -1 : memberA > memberB ? 1 : 0);

// 負の位置を含む start・stop を、長さ length の範囲に直す（範囲外なら null）
const normalizeRange = (start, stop, length) => {
  let from = start < 0 ? length + start : start;
  let to = stop < 0 ? length + stop : stop;
  from = Math.max(from, 0);
  to = Math.min(to, length - 1);
  return from > to || from >= length ? null : [from, to];
};

const formatScore = (score) => String(score);

export async function startFakeKv({ token = 'fake-kv-token' } = {}) {
  const store = new Map(); // key -> { type: 'string' | 'zset' | 'hash', value, expiresAt? }
  const commands = []; // 受けた命令（[名前, ...引数]・名前は小文字）
  let failing = false;

  const read = (key) => {
    const entry = store.get(key);
    if (entry?.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      store.delete(key);
      return undefined;
    }
    return entry;
  };
  const readTyped = (key, type) => {
    const entry = read(key);
    if (entry && entry.type !== type) throw wrongType();
    return entry;
  };
  const ensure = (key, type, create) => {
    const entry = readTyped(key, type);
    if (entry) return entry;
    const created = { type, value: create() };
    store.set(key, created);
    return created;
  };

  // INCR・DECR（期限はそのまま残す）
  const addInteger = (key, delta) => {
    const entry = readTyped(key, 'string');
    const current = entry ? Number(entry.value) : 0;
    if (!Number.isInteger(current)) throw new CommandError('ERR value is not an integer or out of range');
    const next = current + delta;
    store.set(key, { ...entry, type: 'string', value: String(next) });
    return next;
  };

  const handlers = {
    ping: () => 'PONG',
    get: ([key]) => readTyped(key, 'string')?.value ?? null,
    mget: (keys) => keys.map((key) => {
      const entry = read(key);
      return entry?.type === 'string' ? entry.value : null;
    }),
    set: ([key, value, ...options]) => {
      const flags = options.map((option) => option.toLowerCase());
      const exists = read(key) !== undefined;
      if ((flags.includes('nx') && exists) || (flags.includes('xx') && !exists)) return null;
      const entry = { type: 'string', value };
      const ex = flags.indexOf('ex');
      if (ex >= 0) entry.expiresAt = Date.now() + Number(options[ex + 1]) * 1000;
      const px = flags.indexOf('px');
      if (px >= 0) entry.expiresAt = Date.now() + Number(options[px + 1]);
      store.set(key, entry);
      return OK;
    },
    del: (keys) => keys.filter((key) => read(key) !== undefined && store.delete(key)).length,
    exists: (keys) => keys.filter((key) => read(key) !== undefined).length,
    incr: ([key]) => addInteger(key, 1),
    decr: ([key]) => addInteger(key, -1),
    expire: ([key, seconds]) => {
      const entry = read(key);
      if (!entry) return 0;
      entry.expiresAt = Date.now() + Number(seconds) * 1000;
      return 1;
    },
    ttl: ([key]) => {
      const entry = read(key);
      if (!entry) return -2;
      return entry.expiresAt === undefined ? -1 : Math.ceil((entry.expiresAt - Date.now()) / 1000);
    },
    zadd: ([key, ...rest]) => {
      const flags = [];
      while (rest.length > 0 && ['nx', 'xx', 'ch', 'gt', 'lt'].includes(String(rest[0]).toLowerCase())) {
        flags.push(String(rest.shift()).toLowerCase());
      }
      if (rest.length === 0 || rest.length % 2 !== 0) throw new CommandError('ERR syntax error');
      const zset = ensure(key, 'zset', () => new Map()).value;
      let changed = 0;
      for (let index = 0; index < rest.length; index += 2) {
        const score = Number(rest[index]);
        const member = String(rest[index + 1]);
        if (Number.isNaN(score)) throw new CommandError('ERR value is not a valid float');
        const exists = zset.has(member);
        if ((flags.includes('nx') && exists) || (flags.includes('xx') && !exists)) continue;
        if (!exists || (flags.includes('ch') && zset.get(member) !== score)) changed += 1;
        zset.set(member, score);
      }
      return changed;
    },
    zcard: ([key]) => readTyped(key, 'zset')?.value.size ?? 0,
    zscore: ([key, member]) => {
      const score = readTyped(key, 'zset')?.value.get(String(member));
      return score === undefined ? null : formatScore(score);
    },
    zrange: ([key, start, stop, ...options]) => {
      const flags = options.map((option) => String(option).toLowerCase());
      if (flags.some((flag) => flag !== 'rev' && flag !== 'withscores')) throw new CommandError('ERR fake: unsupported zrange option');
      const entry = readTyped(key, 'zset');
      if (!entry) return [];
      const sorted = sortZset(entry.value);
      if (flags.includes('rev')) sorted.reverse();
      const range = normalizeRange(Number(start), Number(stop), sorted.length);
      if (!range) return [];
      const picked = sorted.slice(range[0], range[1] + 1);
      return flags.includes('withscores')
        ? picked.flatMap(([member, score]) => [member, formatScore(score)])
        : picked.map(([member]) => member);
    },
    zrem: ([key, ...members]) => {
      const entry = readTyped(key, 'zset');
      if (!entry) return 0;
      const removed = members.filter((member) => entry.value.delete(String(member))).length;
      if (entry.value.size === 0) store.delete(key);
      return removed;
    },
    zremrangebyrank: ([key, start, stop]) => {
      const entry = readTyped(key, 'zset');
      if (!entry) return 0;
      const sorted = sortZset(entry.value);
      const range = normalizeRange(Number(start), Number(stop), sorted.length);
      if (!range) return 0;
      const victims = sorted.slice(range[0], range[1] + 1);
      for (const [member] of victims) entry.value.delete(member);
      if (entry.value.size === 0) store.delete(key);
      return victims.length;
    },
    hset: ([key, ...pairs]) => {
      if (pairs.length === 0 || pairs.length % 2 !== 0) throw new CommandError('ERR wrong number of arguments');
      const hash = ensure(key, 'hash', () => new Map()).value;
      let added = 0;
      for (let index = 0; index < pairs.length; index += 2) {
        if (!hash.has(pairs[index])) added += 1;
        hash.set(String(pairs[index]), String(pairs[index + 1]));
      }
      return added;
    },
    hget: ([key, field]) => readTyped(key, 'hash')?.value.get(String(field)) ?? null,
    hdel: ([key, ...fields]) => {
      const entry = readTyped(key, 'hash');
      if (!entry) return 0;
      const removed = fields.filter((field) => entry.value.delete(String(field))).length;
      if (entry.value.size === 0) store.delete(key);
      return removed;
    },
    hkeys: ([key]) => [...(readTyped(key, 'hash')?.value.keys() ?? [])],
    hgetall: ([key]) => [...(readTyped(key, 'hash')?.value ?? [])].flat(),
    // 本物と同じく、count 件を取り出してから match で絞る（空の回があってもカーソルは続く）。カーソルは文字列で返す
    scan: ([cursor, ...options]) => {
      const flags = options.map((option) => String(option).toLowerCase());
      const matchIndex = flags.indexOf('match');
      const countIndex = flags.indexOf('count');
      const pattern = matchIndex >= 0 ? globToRegExp(String(options[matchIndex + 1])) : null;
      const count = countIndex >= 0 ? Number(options[countIndex + 1]) : 10;
      const keys = [...store.keys()].filter((key) => read(key) !== undefined).sort();
      const from = Number(cursor);
      const slice = keys.slice(from, from + count);
      const next = from + count >= keys.length ? 0 : from + count;
      return [String(next), slice.filter((key) => !pattern || pattern.test(key))];
    },
  };

  const run = (command) => {
    const [name, ...rawArgs] = command;
    const lower = String(name).toLowerCase();
    const args = rawArgs.map((arg) => (typeof arg === 'string' ? arg : String(arg)));
    commands.push([lower, ...args]);
    const handler = handlers[lower];
    if (!handler) throw new CommandError(`ERR unknown command '${lower}'`);
    return handler(args);
  };

  // Upstash-Encoding: base64 の時は文字列を base64 にして返す（状態の「OK」はそのまま）
  const encode = (value, base64) => {
    if (value === OK) return 'OK';
    if (Array.isArray(value)) return value.map((item) => encode(item, base64));
    if (typeof value === 'string' && base64) return Buffer.from(value, 'utf8').toString('base64');
    return value;
  };

  const toReply = (command, base64) => {
    try {
      return { result: encode(run(command), base64) };
    } catch (error) {
      if (error instanceof CommandError) return { error: error.message };
      throw error;
    }
  };

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const send = (status, body) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (req.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'Unauthorized' });
      if (failing) return send(500, { error: 'fake: storage unavailable' });
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return send(400, { error: 'ERR failed to parse body' });
      }
      const base64 = String(req.headers['upstash-encoding'] ?? '').toLowerCase() === 'base64';
      const path = (req.url ?? '/').split('?')[0];
      if (path === '/pipeline' || path === '/multi-exec') {
        return send(200, body.map((command) => toReply(command, base64)));
      }
      const reply = toReply(body, base64);
      return send(reply.error ? 400 : 200, reply);
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}`,
    token,
    commands,
    // 試験の下準備・確かめ用（命令の記録には残さない）
    setString: (key, value) => store.set(key, { type: 'string', value }),
    setHash: (key, entries) => store.set(key, { type: 'hash', value: new Map(Object.entries(entries)) }),
    zadd: (key, score, member) => ensure(key, 'zset', () => new Map()).value.set(member, score),
    getString: (key) => readTyped(key, 'string')?.value ?? null,
    zscore: (key, member) => readTyped(key, 'zset')?.value.get(member) ?? null,
    zmembers: (key) => sortZset(readTyped(key, 'zset')?.value ?? new Map()).reverse().map(([member]) => member),
    hget: (key, field) => readTyped(key, 'hash')?.value.get(field) ?? null,
    keys: () => [...store.keys()].filter((key) => read(key) !== undefined).sort(),
    // 中身の写し（書き込みが無かったことを比べる）
    snapshot: () => JSON.stringify([...store].sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, entry]) => [
      key, entry.type, entry.value instanceof Map ? [...entry.value].sort() : entry.value,
    ])),
    clear: () => {
      store.clear();
      commands.length = 0;
    },
    setFailing: (value) => {
      failing = value;
    },
    close: () => new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    }),
  };
}
