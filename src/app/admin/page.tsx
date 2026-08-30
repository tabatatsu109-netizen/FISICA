import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import { personalLoginId } from "@/lib/team";
import { AdminForms } from "./AdminForms";

export default async function AdminPage() {
  await requireAdmin();

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      users: {
        where: { role: "COACH" },
        select: { id: true, name: true, loginId: true },
        orderBy: { name: "asc" },
      },
      _count: { select: { users: true } },
    },
  });

  // 選手数はチームごとに1クエリまとめて数える
  const playerCounts = await prisma.user.groupBy({
    by: ["teamId"],
    where: { role: "PLAYER" },
    _count: { _all: true },
  });
  const playerCountByTeam = new Map(playerCounts.map((p) => [p.teamId, p._count._all]));

  const teamList = teams.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    playerCount: playerCountByTeam.get(t.id) ?? 0,
    coaches: t.users.map((c) => ({ id: c.id, name: c.name, loginId: personalLoginId(c.loginId, t.code) })),
  }));

  return <AdminForms teams={teamList} />;
}
