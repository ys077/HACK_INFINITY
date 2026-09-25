import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';
import { AuditVerificationService } from '../services/auditVerification.service.js';

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const skip = (page - 1) * limit;

    const { action, actorId, entityType, from, to } = req.query;

    const whereClause: any = {};
    if (action) whereClause.action = action;
    if (actorId) whereClause.actorId = actorId;
    if (entityType) whereClause.entityType = entityType;
    if (from || to) {
      whereClause.createdAt = {};
      if (from) whereClause.createdAt.gte = new Date(from as string);
      if (to) whereClause.createdAt.lte = new Date(to as string);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { actor: { select: { role: true, email: true } } }
      }),
      prisma.auditLog.count({ where: whereClause })
    ]);

    // Map logs to include actorRole and quick integrity check
    const mappedLogs = await Promise.all(logs.map(async log => {
      const { verified } = await AuditVerificationService.verifyAuditRecord(log.id);
      return {
        id: log.id,
        timestamp: log.timestamp,
        actorRole: log.actor?.role || 'SYSTEM',
        actorEmail: log.actor?.email,
        actorId: log.actorId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        integrity: { verified }
      };
    }));

    res.json({
      success: true,
      data: mappedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAuditLogById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: { actor: { select: { role: true, email: true } } }
    });

    if (!log) {
      res.status(404).json({ success: false, message: 'Audit log not found' });
      return;
    }

    const { verified } = await AuditVerificationService.verifyAuditRecord(log.id);

    res.json({
      success: true,
      data: {
        id: log.id,
        timestamp: log.timestamp,
        actorRole: log.actor?.role || 'SYSTEM',
        actorEmail: log.actor?.email,
        actorId: log.actorId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        integrity: { verified }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyAuditChain = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query;
    
    const fromDate = from ? new Date(from as string) : undefined;
    const toDate = to ? new Date(to as string) : undefined;

    const result = await AuditVerificationService.verifyAuditChain(fromDate, toDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyAuditRecord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await AuditVerificationService.verifyAuditRecord(id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
