import { redirect } from "next/navigation";
import { prisma } from "./db";
import { getSession } from "./session";

/**
 * 監督としてログインしていることを確認し、所属チームIDを返す。
 * getSession() の role・teamId はCookieではなくDBの値なので、
 * Cookieを書き換えても他チームに成り代われない。
 */
export async function requireCoachTeam(): Promise<{ userId: string; teamId: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "COACH") redirect(session.role === "ADMIN" ? "/admin" : "/player");
  // チーム未所属の監督は運用上ありえないが、その場合も他チームを見せない
  if (!session.teamId) redirect("/login");

  return { userId: session.userId, teamId: session.teamId };
}

export async function requireAdmin(): Promise<{ userId: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect(session.role === "COACH" ? "/coach" : "/player");
  return { userId: session.userId };
}

/** 対象の選手が指定チームに所属しているか。他チームの選手は null を返す */
export async function findTeamPlayer(userId: string, teamId: string) {
  return prisma.user.findFirst({
    where: { id: userId, teamId, role: "PLAYER" },
    include: { profile: true, team: true },
  });
}
