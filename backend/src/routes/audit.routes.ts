import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  getAuditLogs,
  getAuditLogById,
  verifyAuditChain,
  verifyAuditRecord
} from '../controllers/audit.controller.js';

const router = Router();

router.get('/admin/audit', requireAuth, requireRole('ADMIN'), getAuditLogs);
router.get('/admin/audit/verify', requireAuth, requireRole('ADMIN'), verifyAuditChain);
router.get('/admin/audit/:id', requireAuth, requireRole('ADMIN'), getAuditLogById);
router.get('/admin/audit/verify/:id', requireAuth, requireRole('ADMIN'), verifyAuditRecord);

export default router;
