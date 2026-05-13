const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin(email, password, fullName) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role: 'ADMIN',
        isVerified: true
      }
    });

    console.log(`Compte Administrateur créé avec succès :`);
    console.log(`Email : ${admin.email}`);
    console.log(`Nom   : ${admin.fullName}`);
  } catch (error) {
    if (error.code === 'P2002') {
      console.error("Erreur : Cet email est déjà utilisé.");
    } else {
      console.error(`Erreur : ${error.message}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || "Admin Nexcore";

if (!email || !password) {
  console.log("Usage: node create-admin.js email password 'Nom Complet'");
} else {
  createAdmin(email, password, name);
}
