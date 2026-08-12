import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { todayStr } from "@/lib/data";
import { parseMeals } from "@/lib/meals";
import { RecordForm } from "./RecordForm";

export default async function RecordPage() {
  const session = (await getSession())!;
  const date = todayStr();
  const existing = await prisma.dailyRecord.findUnique({
    where: { userId_date: { userId: session.userId, date } },
  });
  // 直近の身長を初期値に(毎日測らない前提)
  const lastHeight =
    existing?.heightCm ??
    (
      await prisma.dailyRecord.findFirst({
        where: { userId: session.userId, heightCm: { not: null } },
        orderBy: { date: "desc" },
        select: { heightCm: true },
      })
    )?.heightCm ??
    null;

  const [y, m, d] = date.split("-");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-black">今日の記録</h2>
        <p className="text-sm text-ink-3 mt-1 tabular">
          {y}年{Number(m)}月{Number(d)}日 {existing ? "(入力済み・上書き保存できます)" : ""}
        </p>
      </div>
      <RecordForm
        defaults={{
          date,
          weightKg: existing?.weightKg ?? null,
          heightCm: lastHeight,
          sleepHours: existing?.sleepHours ?? null,
          sleepQuality: existing?.sleepQuality ?? null,
          condition: existing?.condition ?? null,
          fatigue: existing?.fatigue ?? null,
          soreness: existing?.soreness ?? null,
          rpe: existing?.rpe ?? null,
          meals: parseMeals(existing?.mealsJson),
          note: existing?.note ?? "",
        }}
      />
    </div>
  );
}
