import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "demo1234";

const PLAYERS = [
  { loginId: "sato", name: "佐藤 蓮", position: "FW", grade: 3, jersey: 9, birth: "2008-06-14", baseH: 174.2, baseW: 64.5, discipline: 0.9 },
  { loginId: "suzuki", name: "鈴木 大和", position: "MF", grade: 3, jersey: 8, birth: "2008-09-02", baseH: 170.8, baseW: 60.2, discipline: 0.8 },
  { loginId: "takahashi", name: "高橋 陽翔", position: "DF", grade: 2, jersey: 4, birth: "2009-04-21", baseH: 178.5, baseW: 66.0, discipline: 0.7 },
  { loginId: "tanaka", name: "田中 悠真", position: "GK", grade: 2, jersey: 1, birth: "2009-11-30", baseH: 182.0, baseW: 71.5, discipline: 0.85 },
  { loginId: "ito", name: "伊藤 湊", position: "MF", grade: 2, jersey: 10, birth: "2010-01-17", baseH: 168.3, baseW: 56.8, discipline: 0.95 },
  { loginId: "watanabe", name: "渡辺 樹", position: "DF", grade: 1, jersey: 5, birth: "2010-07-08", baseH: 172.6, baseW: 59.0, discipline: 0.6 },
  { loginId: "yamamoto", name: "山本 陸", position: "FW", grade: 1, jersey: 11, birth: "2010-10-25", baseH: 166.9, baseW: 54.3, discipline: 0.75 },
  { loginId: "nakamura", name: "中村 颯太", position: "MF", grade: 1, jersey: 7, birth: "2011-02-12", baseH: 164.0, baseW: 52.1, discipline: 0.5 },
];

// 疑似乱数(シード固定で再現性を持たせる)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MEAL_TAGS = ["主食", "主菜", "副菜", "乳製品", "果物"];

function makeMeals(rand, discipline) {
  const meals = {};
  for (const key of ["breakfast", "lunch", "dinner"]) {
    const ate = rand() < 0.85 + discipline * 0.13;
    const tags = ate ? MEAL_TAGS.filter(() => rand() < 0.45 + discipline * 0.45) : [];
    meals[key] = { ate, tags };
  }
  meals.snack = { ate: rand() < discipline * 0.6, tags: [] };
  return meals;
}

async function main() {
  await prisma.dailyRecord.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 10);

  await prisma.user.create({
    data: { loginId: "coach", passwordHash: hash, name: "監督 剛", role: "COACH" },
  });

  const today = new Date();
  const DAYS = 75;

  for (let pi = 0; pi < PLAYERS.length; pi++) {
    const p = PLAYERS[pi];
    const user = await prisma.user.create({
      data: {
        loginId: p.loginId,
        passwordHash: hash,
        name: p.name,
        role: "PLAYER",
        profile: {
          create: {
            birthDate: new Date(p.birth),
            sex: "MALE",
            position: p.position,
            grade: p.grade,
            jerseyNumber: p.jersey,
          },
        },
      },
    });

    const rand = mulberry32(1000 + pi * 77);
    const records = [];
    for (let i = DAYS; i >= 0; i--) {
      // 記録率: 真面目さに応じて欠測をつくる
      if (rand() > 0.55 + p.discipline * 0.43) continue;
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const progress = (DAYS - i) / DAYS;

      const weight = p.baseW + progress * (0.8 + p.discipline * 1.6) + (rand() - 0.5) * 0.8;
      const height = p.baseH + progress * (p.grade === 1 ? 1.2 : 0.4) + (rand() - 0.5) * 0.2;
      const sleep = 5.8 + p.discipline * 2.2 + (rand() - 0.5) * 1.6;
      const quality = Math.min(5, Math.max(1, Math.round(2.4 + p.discipline * 2 + (rand() - 0.5) * 2)));
      const condition = Math.min(5, Math.max(1, Math.round(2.6 + p.discipline * 1.6 + (rand() - 0.5) * 2)));
      const fatigue = Math.min(5, Math.max(1, Math.round(3.6 - p.discipline * 1.2 + (rand() - 0.5) * 2)));
      const soreness = Math.min(5, Math.max(1, Math.round(3.2 - p.discipline * 1.0 + (rand() - 0.5) * 2)));
      const rpe = Math.min(10, Math.max(1, Math.round(5 + (rand() - 0.5) * 5)));

      records.push({
        userId: user.id,
        date: dateStr(d),
        weightKg: Math.round(weight * 10) / 10,
        heightCm: Math.round(height * 10) / 10,
        sleepHours: Math.round(sleep * 10) / 10,
        sleepQuality: quality,
        condition,
        fatigue,
        soreness,
        rpe,
        mealsJson: JSON.stringify(makeMeals(rand, p.discipline)),
        note: null,
      });
    }
    await prisma.dailyRecord.createMany({ data: records });
    console.log(`${p.name}: ${records.length} records`);
  }

  console.log("Seed done. Login: coach / demo1234, players e.g. sato / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
