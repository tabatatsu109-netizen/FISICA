// ログインの総当たり対策。
//
// Vercel はリクエストごとに別プロセスになりうるので、試行回数はメモリではなくDBで持つ。
// 存在しないログインIDも同じように記録・ロックする。存在するIDだけロックすると、
// ロックされたかどうかで実在するIDを判別できてしまうため。

import { prisma } from "./db";

/** 失敗回数を数える期間 */
const WINDOW_MS = 15 * 60 * 1000;
/** この回数を超えて失敗したらロックする */
const MAX_FAILURES = 10;
/** ロックする時間 */
const LOCK_MS = 15 * 60 * 1000;
/** 使われなくなった記録を消すまでの猶予 */
const STALE_MS = 24 * 60 * 60 * 1000;

/** ロック中なら解除時刻を返す。ロックされていなければ null */
export async function loginLockedUntil(loginId: string): Promise<Date | null> {
  const attempt = await prisma.loginAttempt.findUnique({ where: { loginId } });
  if (!attempt?.lockedUntil) return null;
  return attempt.lockedUntil > new Date() ? attempt.lockedUntil : null;
}

export async function recordLoginFailure(loginId: string): Promise<void> {
  const now = new Date();
  const attempt = await prisma.loginAttempt.findUnique({ where: { loginId } });

  // 記録が無い、または前回の集計期間を過ぎている場合は数え直す
  if (!attempt || attempt.windowStart.getTime() + WINDOW_MS < now.getTime()) {
    await prisma.loginAttempt.upsert({
      where: { loginId },
      create: { loginId, failures: 1, windowStart: now },
      update: { failures: 1, windowStart: now, lockedUntil: null },
    });
    // 溜まりっぱなしになるのを防ぐため、期限切れの記録をここで掃除する
    await prisma.loginAttempt.deleteMany({
      where: {
        windowStart: { lt: new Date(now.getTime() - STALE_MS) },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
    });
    return;
  }

  const failures = attempt.failures + 1;
  await prisma.loginAttempt.update({
    where: { loginId },
    data: {
      failures,
      lockedUntil: failures >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS) : null,
    },
  });
}

/** ログインに成功したら記録を消す */
export async function clearLoginFailures(loginId: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { loginId } });
}

/** 画面に出す「あと何分待てばいいか」 */
export function minutesUntil(until: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));
}
