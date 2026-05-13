const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promoteToAdmin(email) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    });
    console.log(`Utilisateur ${email} promu ADMIN avec succès !`);
  } catch (error) {
    console.error(`Erreur: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.log("Usage: node promote-admin.js user@email.com");
} else {
  promoteToAdmin(email);
}
