import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';

export class AuditVerificationService {
  private static readonly GENESIS_HASH = "GENESIS_00000000000000000000000000000000000000000000000000000000";

  private static computeHash(payload: any): string {
    const stringified = JSON.stringify(payload);
    return crypto.createHash('sha256').update(stringified).digest('hex');
  }

  static async verifyAuditChain(from?: Date, to?: Date) {
    const whereClause: any = {};
    if (from || to) {
      whereClause.createdAt = {};
      if (from) whereClause.createdAt.gte = from;
      if (to) whereClause.createdAt.lte = to;
    }

    const records = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' }
      ]
    });

    if (records.length === 0) {
      return { verified: true, checkedRecords: 0 };
    }

    // Verify each record
    let previousValidHash = from ? undefined : this.GENESIS_HASH;

    if (from && records.length > 0) {
       // if filtering by date, we need to fetch the immediately preceding record to verify the first in range
       const precedingRecord = await prisma.auditLog.findFirst({
         where: {
           createdAt: { lt: records[0].createdAt }
         },
         orderBy: [
           { createdAt: 'desc' },
           { id: 'desc' }
         ]
       });
       previousValidHash = precedingRecord?.eventHash || this.GENESIS_HASH;
    }

    let expectedPrevHash = previousValidHash;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // 1. Verify previous hash matches the expected chain
      if (record.previousHash !== expectedPrevHash) {
        return {
          verified: false,
          checkedRecords: i,
          error: {
            type: "CHAIN_BREAK",
            recordId: record.id,
            expectedPreviousHash: expectedPrevHash,
            actualPreviousHash: record.previousHash
          }
        };
      }

      // 2. Verify current hash matches its contents
      const payload = {
        version: 1,
        timestamp: record.timestamp.toISOString(),
        actorId: record.actorId,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId,
        metadata: record.metadata,
        previousHash: record.previousHash
      };

      const computedHash = this.computeHash(payload);

      if (computedHash !== record.eventHash) {
        return {
          verified: false,
          checkedRecords: i,
          error: {
            type: "HASH_MISMATCH",
            recordId: record.id,
            expectedHash: computedHash,
            actualHash: record.eventHash
          }
        };
      }

      // Update expected previous hash for next iteration
      expectedPrevHash = record.eventHash;
    }

    return {
      verified: true,
      checkedRecords: records.length,
      firstRecord: records[0].id,
      lastRecord: records[records.length - 1].id,
      verifiedAt: new Date().toISOString()
    };
  }

  static async verifyAuditRecord(id: string) {
    const record = await prisma.auditLog.findUnique({ where: { id } });
    if (!record) throw new Error("Record not found");

    const payload = {
      version: 1,
      timestamp: record.timestamp.toISOString(),
      actorId: record.actorId,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      metadata: record.metadata,
      previousHash: record.previousHash
    };

    const computedHash = this.computeHash(payload);
    
    return {
      verified: computedHash === record.eventHash,
      recordId: id,
      expectedHash: computedHash,
      actualHash: record.eventHash
    };
  }
}
