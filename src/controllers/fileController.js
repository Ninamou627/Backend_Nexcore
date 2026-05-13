const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const { encrypt, decrypt } = require('../utils/encryptionUtils');

const uploadProjectFile = async (req, res) => {
  try {
    const { projectId, category } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Aucun fichier fourni.' });
    }

    if (!projectId) {
      return res.status(400).json({ message: 'ID du projet manquant.' });
    }

    // Lire le fichier, le chiffrer et l'écraser sur le disque
    const fileBuffer = fs.readFileSync(file.path);
    const encryptedBuffer = encrypt(fileBuffer);
    fs.writeFileSync(file.path, encryptedBuffer);

    // Créer l'entrée dans la base de données
    const newFile = await prisma.file.create({
      data: {
        name: file.originalname,
        type: path.extname(file.originalname).replace('.', ''),
        size: (file.size / 1024).toFixed(1) + ' KB',
        path: file.path,
        category: category || 'Général',
        projectId: projectId,
        uploaderId: req.user.id,
      },
      include: {
        uploader: {
          select: { fullName: true }
        }
      }
    });

    res.status(201).json(newFile);
  } catch (error) {
    console.error('File Upload Error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'importation du fichier.' });
  }
};

const getProjectFiles = async (req, res) => {
  try {
    const { projectId } = req.params;

    const files = await prisma.file.findMany({
      where: { projectId },
      include: {
        uploader: {
          select: { fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(files);
  } catch (error) {
    console.error('Get Files Error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des fichiers.' });
  }
};

const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await prisma.file.findUnique({
      where: { id }
    });

    if (!file) {
      return res.status(404).json({ message: 'Fichier non trouvé.' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ message: 'Le fichier physique n\'existe pas.' });
    }

    // Lire le fichier chiffré
    const encryptedBuffer = fs.readFileSync(file.path);
    // Le déchiffrer
    const decryptedBuffer = decrypt(encryptedBuffer);

    // Envoyer au client
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.send(decryptedBuffer);
  } catch (error) {
    console.error('Download File Error:', error);
    res.status(500).json({ message: 'Erreur lors du téléchargement.' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await prisma.file.findUnique({
      where: { id }
    });

    if (!file) {
      return res.status(404).json({ message: 'Fichier non trouvé.' });
    }

    // Supprimer le fichier physique
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Supprimer de la BDD
    await prisma.file.delete({
      where: { id }
    });

    res.json({ message: 'Fichier supprimé avec succès.' });
  } catch (error) {
    console.error('Delete File Error:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du fichier.' });
  }
};

module.exports = {
  uploadProjectFile,
  getProjectFiles,
  downloadFile,
  deleteFile
};
