// チームとログインIDの組み立てルール
//
// ログイン画面は「チームコード / ID / パスワード」の3欄で受け取るが、
// DB上の User.loginId は "チームコード-個人ID" を連結したグローバル一意の文字列にする。
// こうすると他チームと個人IDが衝突せず、ADMIN(teamId が null)の重複も防げる。

export type Role = "ADMIN" | "COACH" | "PLAYER";

/** チームコード・個人IDに使える文字(半角英数字とハイフン・アンダースコア) */
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const TEAM_CODE_MAX = 20;
export const LOGIN_ID_MAX = 30;

export function normalizeTeamCode(v: string): string {
  return v.trim().toLowerCase();
}

export function isValidTeamCode(code: string): boolean {
  return code.length > 0 && code.length <= TEAM_CODE_MAX && ID_PATTERN.test(code);
}

export function isValidPersonalId(id: string): boolean {
  return id.length > 0 && id.length <= LOGIN_ID_MAX && ID_PATTERN.test(id);
}

/**
 * チームコードと個人IDから、DBに保存するログインIDを組み立てる。
 * チームコードが空(運営者)のときは個人IDをそのまま使う。
 */
export function buildLoginId(teamCode: string, personalId: string): string {
  const code = normalizeTeamCode(teamCode);
  const id = personalId.trim();
  return code ? `${code}-${id}` : id;
}

/** 画面表示用に、ログインIDからチームコードのプレフィックスを外す */
export function personalLoginId(loginId: string, teamCode: string | null | undefined): string {
  if (!teamCode) return loginId;
  const prefix = `${normalizeTeamCode(teamCode)}-`;
  return loginId.startsWith(prefix) ? loginId.slice(prefix.length) : loginId;
}

/** CSV一括登録の上限。取り込みが長引いてタイムアウトするのを防ぐ */
export const BULK_MAX_ROWS = 200;

// 総当たりに耐えるための下限。ログイン試行にレート制限を入れても、
// 4文字では候補が少なすぎて破られる。
export const PASSWORD_MIN = 8;

export function isValidPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN;
}

/** 初期パスワードの自動生成(紛らわしい文字 l,1,o,0 を除いた8桁) */
const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

export function generatePassword(length = 8): string {
  // Math.random は予測可能なのでパスワードには使わない
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return out;
}
