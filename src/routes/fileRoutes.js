const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadProjectFile, getProjectFiles, deleteFile, downloadFile } = require('../controllers/fileController');
const { protect } = require('../middlewares/authMiddleware');

// Configuration de Multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/projects';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fs = require('fs');
const upload = multer({ storage });

router.post('/upload', protect, upload.single('file'), uploadProjectFile);
router.get('/project/:projectId', protect, getProjectFiles);
router.get('/download/:id', protect, downloadFile);
router.delete('/:id', protect, deleteFile);

module.exports = router;
