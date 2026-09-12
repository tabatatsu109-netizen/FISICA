import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCoachTeam } from "@/lib/guard";
import { personalLoginId } from "@/lib/team";
import { PlayersForm } from "./PlayersForm";

// CSV一括登録は100名で10秒前後かかる(bcryptのハッシュ化が支配的)。
// このページのServer Actionの実行上限を延ばしておく。
export const maxDuration = 60;

export default async function PlayersPage() {
  const { teamId } = await requireCoachTeam();

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      code: true,
      users: {
        where: { role: "PLAYER" },
        select: { id: true, name: true, loginId: true },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!team) notFound();

  const roster = team.users.map((u) => ({
    id: u.id,
    name: u.name,
    loginId: personalLoginId(u.loginId, team.code),
  }));

  return <PlayersForm teamCode={team.code} roster={roster} />;
}
