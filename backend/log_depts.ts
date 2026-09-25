import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const depts = await prisma.department.findMany();
  console.log(depts.map(d => d.name));
  await prisma.$disconnect();
}
main();
