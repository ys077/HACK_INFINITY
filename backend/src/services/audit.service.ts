import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';

export type AuditAction = 
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "DEVICE_REGISTERED"
  | "DEVICE_REVOKED"
  | "SESSION_STARTED"
  | "SESSION_ENDED"
  | "PRESENCE_JOINED"
  | "PRESENCE_REJOINED"
  | "PRESENCE_TIMEOUT"
  | "PRESENCE_LEFT"
  | "CONFLICT_DETECTED"
  | "STUDENT_CREATED"
  | "STUDENT_UPDATED"
  | "STUDENT_STATUS_CHANGED"
  | "FACULTY_CREATED"
  | "FACULTY_UPDATED"
  | "FACULTY_STATUS_CHANGED"
  | "CLASS_CREATED"
  | "CLASS_UPDATED"
  | "ENROLLMENT_CREATED"
  | "ENROLLMENT_REMOVED"
  | "FACULTY_ASSIGNED"
  | "FACULTY_UNASSIGNED"
  | "AUDIT_REPORT_VIEWED"
  | "ATTENDANCE_ANALYTICS_VIEWED";

export interface CreateAuditLogParams {
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: any;
}

export class AuditService {
  private static readonly GENESIS_HASH = "GENESIS_00000000000000000000000000000000000000000000000000000000";

  /**
   * Sanitizes metadata to prevent logging sensitive information
   */
  private static sanitizeMetadata(metadata: any): any {
    if (!metadata) return null;
    
    // Deep clone to avoid mutating original
    const safeData = JSON.parse(JSON.stringify(metadata));
    
    const sensitiveKeys = [
      'password', 'passwordHash', 'privateKey', 'private_key', 
      'refreshToken', 'accessToken', 'challenge', 'challengeSecret', 
      'signature', 'authorizationHeader', 'cookies', 'sessionSecret'
    ];

    const redact = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach(key => {
        if (sensitiveKeys.includes(key) || key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          redact(obj[key]);
        }
      });
    };

    redact(safeData);
    return safeData;
  }

  /**
   * Computes the deterministic hash for an audit record
   */
  private static computeHash(payload: any): string {
    const stringified = JSON.stringify(payload);
    return crypto.createHash('sha256').update(stringified).digest('hex');
  }

  /**
   * Creates an audit log entry, calculating the appropriate hashes
   */
  static async createAuditLog(params: CreateAuditLogParams, tx?: any): Promise<void> {
    const db = tx || prisma;
    const { actorId, action, entityType, entityId, metadata } = params;

    const safeMetadata = this.sanitizeMetadata(metadata);
    const timestamp = new Date();

    // Serialize writing to audit log by relying on a transaction if provided,
    // or just locking by ordering. For web prototype, we fetch the latest record.
    // In a highly concurrent environment, a table lock or serialized isolation level is better.
    const lastRecord = await db.auditLog.findFirst({
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ]
    });

    const previousHash = lastRecord?.eventHash || this.GENESIS_HASH;

    // Canonical payload for hashing
    const payload = {
      version: 1,
      timestamp: timestamp.toISOString(),
      actorId: actorId || null,
      action,
      entityType,
      entityId,
      metadata: safeMetadata || null,
      previousHash
    };

    const eventHash = this.computeHash(payload);

    await db.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        metadata: safeMetadata,
        previousHash,
        eventHash,
        timestamp // using the same timestamp used in hash
      }
    });
  }
}
