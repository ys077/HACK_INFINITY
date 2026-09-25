import api from './api';

export interface AuditLog {
  id: string;
  timestamp: string;
  actorRole: string;
  actorEmail?: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  integrity: {
    verified: boolean;
  };
}

export interface AuditVerificationResult {
  verified: boolean;
  checkedRecords: number;
  firstRecord?: string;
  lastRecord?: string;
  verifiedAt?: string;
  error?: {
    type: string;
    recordId: string;
    expectedPreviousHash?: string;
    actualPreviousHash?: string;
    expectedHash?: string;
    actualHash?: string;
  };
}

export interface AuditListResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const auditApi = {
  getLogs: async (params: { page?: number; limit?: number; action?: string; actorRole?: string; entityType?: string; from?: string; to?: string }) => {
    const response = await api.get('/admin/audit', { params });
    return response.data as AuditListResponse;
  },
  
  getLogById: async (id: string) => {
    const response = await api.get(`/admin/audit/${id}`);
    return response.data.data as AuditLog;
  },
  
  verifyChain: async (params?: { from?: string; to?: string }) => {
    const response = await api.get('/admin/audit/verify', { params });
    return response.data.data as AuditVerificationResult;
  },
  
  verifyRecord: async (id: string) => {
    const response = await api.get(`/admin/audit/verify/${id}`);
    return response.data.data as AuditVerificationResult;
  }
};
