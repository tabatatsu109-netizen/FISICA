import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const u = await p.user.findUnique({ where: { loginId: process.argv[2] ?? "sato" } });
console.log(u.id);
await p.$disconnect();
