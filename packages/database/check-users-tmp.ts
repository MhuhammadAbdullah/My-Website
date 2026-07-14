import { PrismaClient } from "./generated/client/index.js";
const prisma = new PrismaClient();
const users = await prisma.user.findMany({
  select: { id: true, email: true, banned: true, roleId: true, role: { select: { name: true } } },
});
console.log("USERS", JSON.stringify(users, null, 2));
const accounts = await prisma.account.findMany({ select: { id: true, userId: true, providerId: true } });
console.log("ACCOUNTS", JSON.stringify(accounts, null, 2));
await prisma.$disconnect();
