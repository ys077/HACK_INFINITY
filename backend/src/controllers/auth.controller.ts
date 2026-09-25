import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../utils/password.js';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AuditService } from '../services/audit.service.js';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid request data', errors: parseResult.error.format() });
      return;
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        student: true,
        faculty: true,
        admin: true
      }
    });

    if (!user) {
      await AuditService.createAuditLog({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: email,
        metadata: { email, reason: 'Invalid email' }
      });
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await AuditService.createAuditLog({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        metadata: { email, reason: 'Invalid password' }
      });
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(401).json({ success: false, message: 'Account is not active' });
      return;
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await AuditService.createAuditLog({
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role }
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = refreshSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid request data' });
      return;
    }

    const { refreshToken } = parseResult.data;

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub }
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({ success: false, message: 'Invalid user or inactive account' });
      return;
    }

    const payload = { sub: user.id, role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload); // Refresh token rotation

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // In a stateless JWT setup without a token blocklist or a separate session table,
  // we just instruct the client to drop the tokens.
  // Note: if refresh tokens were stored in a DB, we would delete them here.
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          include: { department: true, course: true, section: true }
        },
        faculty: {
          include: { department: true }
        },
        admin: true
      }
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    let profile = null;
    if (user.role === 'STUDENT') profile = user.student;
    else if (user.role === 'FACULTY') profile = user.faculty;
    else if (user.role === 'ADMIN') profile = user.admin;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        profile
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const googleOidcStart = async (req: Request, res: Response): Promise<void> => {
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'consent'
  });
  res.json({ success: true, url });
};

export const googleOidcCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.redirect(`${process.env.APP_BASE_URL}/login?error=Invalid_OIDC_Callback`);
      return;
    }
    const { tokens } = await googleClient.getToken(code);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error('No payload in id_token');
    
    const { sub, email } = payload;
    
    // Check if UserIdentity exists
    let identity = await prisma.userIdentity.findUnique({
      where: { provider_providerSubjectId: { provider: 'GOOGLE', providerSubjectId: sub } },
      include: { user: true }
    });
    
    let user = identity?.user || null;
    
    if (!user && email) {
      // Find by email to link
      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.userIdentity.create({
          data: {
            userId: user.id,
            provider: 'GOOGLE',
            providerSubjectId: sub
          }
        });
      }
    }
    
    if (!user) {
      res.redirect(`${process.env.APP_BASE_URL}/login?error=Account_Not_Found`);
      return;
    }
    
    if (user.status !== 'ACTIVE') {
      res.redirect(`${process.env.APP_BASE_URL}/login?error=Account_Inactive`);
      return;
    }
    
    const jwtPayload = { sub: user.id, role: user.role };
    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);
    
    await AuditService.createAuditLog({
      actorId: user.id,
      action: 'SSO_LOGIN',
      entityType: 'User',
      entityId: user.id,
      metadata: { provider: 'GOOGLE', subject: sub }
    });
    
    res.redirect(`${process.env.APP_BASE_URL}/sso-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  } catch (err) {
    console.error('OIDC error:', err);
    res.redirect(`${process.env.APP_BASE_URL}/login?error=OIDC_Verification_Failed`);
  }
};
