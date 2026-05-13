const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('1234', salt);
  
  const user = await prisma.user.update({
    where: { email: 'expert@nexcore.com' },
    data: { password: hashedPassword }
  });
  
  console.log('Password reset successfully for:', user.email);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
