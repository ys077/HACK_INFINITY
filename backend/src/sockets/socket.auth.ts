import { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../lib/prisma.js';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    role: string;
  };
}

export const socketAuthMiddleware = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      return next(new Error('UNAUTHENTICATED'));
    }

    const payload = verifyAccessToken(token);

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) {
      return next(new Error('UNAUTHENTICATED'));
    }

    if (user.status !== 'ACTIVE') {
      return next(new Error('UNAUTHORIZED: Inactive user'));
    }

    // Attach user payload
    socket.user = {
      id: user.id,
      role: user.role
    };

    next();
  } catch (error) {
    next(new Error('UNAUTHENTICATED: Invalid token'));
  }
};
