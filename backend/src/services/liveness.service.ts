import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';

const CHALLENGES = [
  'BLINK_ONCE',
  'BLINK_TWICE',
  'LOOK_LEFT',
  'LOOK_RIGHT',
  'SMILE',
  'OPEN_MOUTH',
  'TURN_HEAD_LEFT',
  'TURN_HEAD_RIGHT'
];

const LIVENESS_TTL_SECONDS = 60; // short-lived

export class LivenessService {
  /**
   * Cryptographically secure random selection of challenge sequences
   */
  static generateRandomSequence(length: number = 2): string[] {
    const sequence: string[] = [];
    for (let i = 0; i < length; i++) {
      const randIndex = crypto.randomInt(0, CHALLENGES.length);
      sequence.push(CHALLENGES[randIndex]);
    }
    return sequence;
  }

  static async generateAttempt(joinChallengeId: string): Promise<any> {
    const sequence = this.generateRandomSequence(1); // 1 for simplicity/speed, can be 2
    const expiresAt = new Date(Date.now() + LIVENESS_TTL_SECONDS * 1000);

    return prisma.livenessAttempt.create({
      data: {
        joinChallengeId,
        challengeType: 'SEQUENCE',
        challengeSequence: sequence,
        expiresAt,
        status: 'STARTED',
      }
    });
  }

  static async recordResult(attemptId: string, passed: boolean, confidence?: number, failureReason?: string) {
    return prisma.livenessAttempt.update({
      where: { id: attemptId },
      data: {
        status: passed ? 'PASSED' : 'FAILED',
        confidenceScore: confidence,
        completedAt: new Date(),
        failureReason
      }
    });
  }
}
