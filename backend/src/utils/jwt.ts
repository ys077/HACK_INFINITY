import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function generateAccessToken(payload: { sub: string; role: string }): string {
  const secret = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret';
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

export function generateRefreshToken(payload: { sub: string; role: string }): string {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret';
  return jwt.verify(token, secret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
  return jwt.verify(token, secret) as JwtPayload;
}
