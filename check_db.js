const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const files = await prisma.file.findMany();
  console.log('FILES IN DB:', JSON.stringify(files, null, 2));
  const projects = await prisma.project.findMany();
  console.log('PROJECTS IN DB:', JSON.stringify(projects, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
