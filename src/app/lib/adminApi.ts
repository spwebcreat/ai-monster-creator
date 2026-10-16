// 管理モードの API をブラウザから呼ぶ（cookie は同じサイトなので自動で付く）。
// 末尾の「/」は next.config の trailingSlash に合わせる（付けないと 308 で転送される）

const postJson = (path: string, body?: unknown) =>
  fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

// 管理モードか。失敗や想定外の返事は「管理モードではない」として扱う
export async function fetchAdminSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/session/', { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return data?.admin === true;
  } catch {
    return false;
  }
}

// wrong = 合言葉が違う（401）/ tooMany = 回数超過（429）/ unavailable = 合言葉が未設定（404）
export type AdminLoginResult = 'ok' | 'wrong' | 'tooMany' | 'unavailable' | 'error';

export async function adminLogin(password: string): Promise<AdminLoginResult> {
  try {
    const res = await postJson('/api/admin/login/', { password });
    if (res.ok) return 'ok';
    if (res.status === 401) return 'wrong';
    if (res.status === 429) return 'tooMany';
    if (res.status === 404) return 'unavailable';
    return 'error';
  } catch {
    return 'error';
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await postJson('/api/admin/logout/');
  } catch {
    // 画面側は管理モードを抜けた扱いにする（cookie は 12 時間で切れる）
  }
}

// expired = cookie が切れた・無い（401）
export type AdminHideResult = 'ok' | 'expired' | 'error';

// 一覧から外す（hidden = true）／元に戻す（hidden = false）。データは消さない
export async function setMonsterHidden(id: string, hidden: boolean): Promise<AdminHideResult> {
  try {
    const res = await postJson(hidden ? '/api/admin/hide/' : '/api/admin/unhide/', { id });
    if (res.ok) return 'ok';
    if (res.status === 401) return 'expired';
    return 'error';
  } catch {
    return 'error';
  }
}
