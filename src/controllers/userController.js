const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const updateProfile = async (req, res) => {
  try {
    const { fullName, company, description, location, experience, skills, portfolio, avatar } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        company,
        description,
        location,
        experience,
        skills,
        portfolio,
        avatar
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        company: true,
        description: true,
        location: true,
        experience: true,
        skills: true,
        portfolio: true,
        avatar: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil.' });
  }
};

module.exports = {
  updateProfile
};
