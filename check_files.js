const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const files = await prisma.file.findMany();
  console.log('FILES COUNT:', files.length);
  files.forEach(f => {
    console.log(`- File: ${f.name}, ProjectID: ${f.projectId}, ID: ${f.id}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
