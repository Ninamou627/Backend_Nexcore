const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const generateToken = (id, role, isMfaPending = false) => {
  return jwt.sign({ id, role, isMfaPending }, process.env.JWT_SECRET, {
    expiresIn: isMfaPending ? '5m' : '2h',
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user.id, user.role);

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  };

  res.status(statusCode).cookie('token', token, cookieOptions).json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  });
};

const registerUser = async (req, res) => {
  const { fullName, email, password, role, company } = req.body;

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'Cet utilisateur existe déjà' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRole = role ? role.toUpperCase() : 'CLIENT';

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: userRole,
        company,
      },
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de compte' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (user.isTwoFactorEnabled) {
        // Retourner un token temporaire qui ne permet que la validation MFA
        return res.json({
          mfaRequired: true,
          tempToken: generateToken(user.id, user.role, true),
        });
      }

      sendTokenResponse(user, 200, res);
    } else {
      res.status(401).json({ message: 'Email ou mot de passe invalide' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
};

const verifyLogin2FA = async (req, res) => {
  const { code, tempToken } = req.body;

  try {
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.isMfaPending) {
      return res.status(401).json({ message: 'Token invalide' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.twoFactorSecret) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Code 2FA invalide' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Session expirée ou invalide' });
  }
};

const setup2FA = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    const secret = speakeasy.generateSecret({
      name: `Nexcore Hub (${user.email})`
    });

    const qrCode = await qrcode.toDataURL(secret.otpauth_url);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorSecret: secret.base32 }
    });

    res.json({ qrCode, secret: secret.base32 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la configuration 2FA' });
  }
};

const verifyAndEnable2FA = async (req, res) => {
  const { code } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Code invalide' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { isTwoFactorEnabled: true }
    });

    res.json({ message: 'Double authentification activée avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la vérification 2FA' });
  }
};

const disable2FA = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        isTwoFactorEnabled: false,
        twoFactorSecret: null 
      }
    });
    res.json({ message: 'Double authentification désactivée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const logoutUser = async (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Déconnexion réussie' });
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true, 
        fullName: true, 
        email: true, 
        role: true, 
        company: true, 
        avatar: true,
        description: true,
        location: true,
        experience: true,
        skills: true,
        portfolio: true,
        isTwoFactorEnabled: true,
        createdAt: true
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyLogin2FA,
  setup2FA,
  verifyAndEnable2FA,
  disable2FA,
  logoutUser,
  getMe,
};
