import { prisma } from '../lib/prisma.js';

export class StepUpVerificationService {
  static async createChallenge(userId: string, challenge: string, expiresAt: Date) {
    return prisma.webAuthnChallenge.create({
      data: {
        userId,
        challenge,
        expiresAt
      }
    });
  }

  static async getChallenge(challenge: string, userId: string) {
    return prisma.webAuthnChallenge.findFirst({
      where: {
        challenge,
        userId,
        expiresAt: { gt: new Date() }
      }
    });
  }

  static async deleteChallenge(challenge: string) {
    await prisma.webAuthnChallenge.delete({
      where: { challenge }
    });
  }

  static async createStepUpSession(userId: string, purpose: string) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    return prisma.stepUpSession.create({
      data: {
        userId,
        purpose,
        expiresAt,
        status: 'VERIFIED'
      }
    });
  }

  static async validateStepUpSession(sessionId: string, userId: string, purpose: string) {
    const session = await prisma.stepUpSession.findFirst({
      where: {
        id: sessionId,
        userId,
        purpose,
        status: 'VERIFIED',
        expiresAt: { gt: new Date() }
      }
    });
    return session;
  }

  static async consumeStepUpSession(sessionId: string) {
    return prisma.stepUpSession.update({
      where: { id: sessionId },
      data: {
        status: 'CONSUMED',
        consumedAt: new Date()
      }
    });
  }
}
